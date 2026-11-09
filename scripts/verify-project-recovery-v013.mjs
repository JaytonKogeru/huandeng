import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { test } from 'node:test';

const require = createRequire(import.meta.url);
const {
  createProjectTabs,
  createFullscreenController,
  createRendererRecovery,
} = require('../packages/desktop/project-tabs.cjs');
const tick = () => new Promise((resolve) => setImmediate(resolve));

class NativeWindow extends EventEmitter {
  fullscreen = false;
  destroyed = false;
  requests = [];
  isFullScreen() {
    return this.fullscreen;
  }
  isDestroyed() {
    return this.destroyed;
  }
  setFullScreen(value) {
    this.requests.push(value);
  }
  complete(value) {
    this.fullscreen = value;
    this.emit(value ? 'enter-full-screen' : 'leave-full-screen');
  }
  close() {
    this.destroyed = true;
    this.emit('closed');
  }
}

test('rapid Present → Escape waits for native entry and then restores the window', async () => {
  const window = new NativeWindow();
  const controller = createFullscreenController({ getWindow: () => window });
  const enter = controller.set(true);
  const exit = controller.set(false);
  await tick();
  assert.deepEqual(window.requests, [true]);
  window.complete(true);
  assert.equal(await enter, true);
  await tick();
  assert.deepEqual(window.requests, [true, false]);
  window.complete(false);
  assert.equal(await exit, false);
  assert.equal(window.isFullScreen(), false);
  assert.equal(window.listenerCount('enter-full-screen'), 0);
  assert.equal(window.listenerCount('leave-full-screen'), 0);
});

test('fullscreen requests recover after invalid input and drain safely on window destruction', async () => {
  const window = new NativeWindow();
  const controller = createFullscreenController({ getWindow: () => window });
  await assert.rejects(controller.set('yes'), /Invalid fullscreen/);
  const enter = controller.set(true);
  const exit = controller.set(false);
  await tick();
  window.close();
  assert.equal(await enter, false);
  assert.equal(await exit, false);
  assert.deepEqual(window.requests, [true]);
});

test('a timed-out transition does not suppress a subsequent explicit restoration request', async () => {
  const window = new NativeWindow();
  const controller = createFullscreenController({ getWindow: () => window, timeoutMs: 10 });
  assert.equal(await controller.set(true), false);
  const exit = controller.set(false);
  await tick();
  assert.deepEqual(window.requests, [true, false]);
  window.complete(false);
  assert.equal(await exit, false);
});

function project(id, contentsId) {
  return {
    id,
    entryKey: id,
    disposing: false,
    rendererLost: false,
    presentationMode: false,
    service: {
      url: `http://127.0.0.1:${9000 + contentsId}`,
      entryPath: `${id}/deck.pptd`,
      title: id,
    },
    view: { webContents: { id: contentsId, isDestroyed: () => false } },
    state: { dirty: true, saving: true, attention: false },
  };
}

test('a crashed presentation releases ownership, skips the dead acknowledgement and reloads only its existing service', async () => {
  const tabs = createProjectTabs();
  const alpha = project('Alpha', 1);
  const beta = project('Beta', 2);
  tabs.add(alpha);
  tabs.add(beta);
  tabs.activate(alpha.id);
  const betaState = structuredClone(beta.state);
  const betaService = beta.service;
  const alphaService = alpha.service;
  const pendingLeaves = new Map([
    [1, 'Alpha acknowledgement'],
    [2, 'Beta acknowledgement'],
  ]);
  const loaded = [];
  const warnings = [];
  const window = new NativeWindow();
  const controller = createFullscreenController({ getWindow: () => window });
  let owner = alpha.id;
  alpha.presentationMode = true;
  const entering = controller.set(true);
  const recovery = createRendererRecovery({
    load: async (item) => {
      loaded.push(`${item.service.url}/huandeng`);
    },
    releasePresentation: (item) => {
      if (owner !== item.id) return Promise.resolve();
      owner = null;
      item.presentationMode = false;
      return controller.set(false);
    },
    rejectLeaves: (item) => pendingLeaves.delete(item.view.webContents.id),
    onChanged: () => {},
    notify: (_item, message) => warnings.push(message),
  });
  const lost = recovery.lost(alpha, { reason: 'crashed' });
  assert.equal(owner, null);
  assert.equal(recovery.canFlush(alpha), false);
  assert.equal(recovery.canFlush(beta), true);
  assert.equal(pendingLeaves.has(1), false);
  assert.equal(pendingLeaves.has(2), true);
  assert.equal(alpha.state.attention, true);
  tabs.activate(beta.id);
  assert.equal(tabs.activeId, beta.id);
  await tick();
  window.complete(true);
  await entering;
  await tick();
  window.complete(false);
  await lost;
  assert.equal(window.isFullScreen(), false);
  assert.match(warnings[0], /Unsaved in-memory drafts may have been lost/);
  assert.match(warnings[0], /Saved Project files have not been changed/);
  await Promise.all([recovery.reload(alpha), recovery.reload(alpha)]);
  assert.deepEqual(loaded, [`${alphaService.url}/huandeng`]);
  assert.equal(alpha.service, alphaService);
  assert.equal(beta.service, betaService);
  assert.deepEqual(beta.state, betaState);
  assert.equal(tabs.activeId, beta.id);
  assert.equal(recovery.canFlush(alpha), true);
  assert.equal(alpha.rendererLost, false);
  assert.equal(alpha.state.dirty, false);
});

test('failed recovery retains a closable lost tab, while intentional disposal does not raise a crash warning', async () => {
  const alpha = project('Alpha', 1);
  const warnings = [];
  const recovery = createRendererRecovery({
    load: async () => {
      throw new Error('Service temporarily unavailable');
    },
    releasePresentation: () => Promise.resolve(),
    rejectLeaves: () => {},
    onChanged: () => {},
    notify: (_item, message) => warnings.push(message),
  });
  await recovery.lost(alpha, { reason: 'crashed' });
  await assert.rejects(recovery.reload(alpha), /Service temporarily unavailable/);
  assert.equal(alpha.rendererLost, true);
  assert.equal(recovery.canFlush(alpha), false);
  assert.equal(alpha.state.attention, true);
  const beta = project('Beta', 2);
  beta.disposing = true;
  await recovery.lost(beta, { reason: 'clean-exit' });
  assert.equal(beta.rendererLost, false);
  assert.equal(warnings.length, 1);
});
