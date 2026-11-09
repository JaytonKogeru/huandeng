import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const {
  validateConfig,
  validatePptx,
  publishProject,
  runPublisher,
  createPublisherScheduler,
} = require('../packages/desktop/publisher.cjs');
const fixture = await fs.readFile(path.join(root, 'tests/fixtures/publisher/package.pptx'));

function publisherWorker(configFile, label) {
  const child = fork(
    path.join(root, 'tests/fixtures/publisher/lock-worker.cjs'),
    [
      path.join(root, 'packages/desktop/publisher.cjs'),
      configFile,
      path.join(root, 'tests/fixtures/publisher/package.pptx'),
      label,
    ],
    { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe', 'ipc'] },
  );
  const messages = [];
  let stderr = '';
  child.stderr.on('data', (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-8000);
  });
  child.on('message', (message) => messages.push(message));
  const done = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  return {
    child,
    done,
    messages,
    send(message) {
      child.send(message);
    },
    wait(type) {
      const existing = messages.find((message) => message.type === type);
      if (existing) return Promise.resolve(existing);
      return new Promise((resolve, reject) => {
        const cleanup = () => {
          clearTimeout(timer);
          child.off('message', onMessage);
          child.off('exit', onExit);
        };
        const onMessage = (message) => {
          if (message.type === 'error') {
            cleanup();
            reject(new Error(message.message));
          } else if (message.type === type) {
            cleanup();
            resolve(message);
          }
        };
        const onExit = (code, signal) => {
          cleanup();
          reject(new Error(`${label} exited before ${type}: ${code}/${signal} ${stderr}`));
        };
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error(`${label} did not report ${type}: ${stderr}`));
        }, 10000);
        child.on('message', onMessage);
        child.once('exit', onExit);
      });
    },
    async stop() {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
      await done;
    },
  };
}

async function setup(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-publisher-test-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const project = {
    id: 'example',
    entry: path.join(directory, 'Project', 'deck.pptd'),
    destination: path.join(directory, 'Share', 'Example.pptx'),
  };
  const output = path.join(directory, 'Project', 'Exports', 'deck.pptx');
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.mkdir(path.dirname(project.destination), { recursive: true });
  await fs.writeFile(project.entry, '{}');
  await fs.writeFile(project.destination, 'previous valid shared output');
  const fingerprint = async () => ({ digest: 'saved-source', newest: 0, count: 3 });
  let exports = 0;
  const exportDeck = async (entry) => {
    assert.equal(entry, project.entry);
    exports++;
    await fs.writeFile(output, fixture);
    return { file: output, report: { pages: [{ pageId: 'synthetic-page' }] } };
  };
  return { directory, project, output, fingerprint, exportDeck, exportCount: () => exports };
}

test('publisher accepts only explicit unique PPTD entries and shared PPTX paths', () => {
  const base = {
    id: 'a',
    entry: path.resolve('a/deck.pptd'),
    destination: path.resolve('Share/a.pptx'),
  };
  assert.equal(validateConfig({ schemaVersion: 1, projects: [base] }).quietMs, 3000);
  assert.throws(
    () => validateConfig({ schemaVersion: 1, projects: [base, { ...base, id: 'b' }] }),
    /unique/,
  );
  assert.throws(
    () => validateConfig({ schemaVersion: 1, projects: [{ ...base, entry: 'relative.pptd' }] }),
    /absolute/,
  );
  assert.throws(
    () =>
      validateConfig({
        schemaVersion: 1,
        projects: [{ ...base, destination: path.resolve('a/Exports/deck.pptx') }],
      }),
    /different path/,
  );
});

test('PPTX validation checks every ZIP member, notes and reported slide count', () => {
  const result = validatePptx(fixture, 1);
  assert.equal(result.slides, 1);
  assert.equal(result.notes, 1);
  assert.equal(result.sha256.length, 64);
  assert.throws(() => validatePptx(fixture, 2), /page count/);
  assert.throws(() => validatePptx(fixture.subarray(0, fixture.length - 4)), /ZIP end/);
  const corrupt = Buffer.from(fixture);
  const central = corrupt.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  corrupt[central + 16] ^= 1;
  assert.throws(() => validatePptx(corrupt), /checksum/);
});

test('native Project output is verified before the fixed shared filename is replaced', async (t) => {
  const s = await setup(t);
  const result = await publishProject(s.project, undefined, s);
  assert.equal(result.projectFile, s.output);
  assert.equal(result.status, 'current');
  assert.deepEqual(await fs.readFile(s.project.destination), await fs.readFile(s.output));
  assert.equal(s.exportCount(), 1);
});

test('unchanged sources do not export again; a missing shared copy is repaired from the verified Project file', async (t) => {
  const s = await setup(t);
  const first = await publishProject(s.project, undefined, s);
  const second = await publishProject(s.project, first, s);
  assert.equal(second.sha256, first.sha256);
  assert.equal(s.exportCount(), 1);
  await fs.unlink(s.project.destination);
  const repaired = await publishProject(s.project, first, s);
  assert.equal(repaired.sha256, first.sha256);
  assert.equal(s.exportCount(), 1);
  assert.deepEqual(await fs.readFile(s.project.destination), fixture);
});

test('changed source during export retains the previous shared output', async (t) => {
  const s = await setup(t);
  let reads = 0;
  const result = await publishProject(s.project, undefined, {
    ...s,
    fingerprint: async () => ({ digest: reads++ ? 'newer-source' : 'saved-source', newest: 0 }),
  });
  assert.equal(result.status, 'waiting');
  assert.equal(await fs.readFile(s.project.destination, 'utf8'), 'previous valid shared output');
});

test('an export failure or corrupt package cannot replace the shared output', async (t) => {
  const s = await setup(t);
  await assert.rejects(
    publishProject(s.project, undefined, {
      ...s,
      exportDeck: async () => {
        throw new Error('Missing image');
      },
    }),
    /Missing image/,
  );
  await assert.rejects(
    publishProject(s.project, undefined, {
      ...s,
      exportDeck: async () => {
        await fs.writeFile(s.output, Buffer.from('broken export'));
        return { file: s.output, report: { pages: [{}] } };
      },
    }),
    /PPTX size/,
  );
  assert.equal(await fs.readFile(s.project.destination, 'utf8'), 'previous valid shared output');
});

test('a locked shared file retains its bytes and leaves no temporary file', async (t) => {
  const s = await setup(t);
  const rename = async () => {
    throw Object.assign(new Error('File is open in Office'), { code: 'EPERM' });
  };
  await assert.rejects(publishProject(s.project, undefined, { ...s, rename }), /open in Office/);
  assert.equal(await fs.readFile(s.project.destination, 'utf8'), 'previous valid shared output');
  assert.deepEqual(await fs.readdir(path.dirname(s.project.destination)), ['Example.pptx']);
});

test('Project errors are recorded without blocking another configured Project', async (t) => {
  const s = await setup(t);
  const second = {
    id: 'other',
    entry: path.join(s.directory, 'Other', 'deck.pptd'),
    destination: path.join(s.directory, 'Share', 'Other.pptx'),
  };
  await fs.mkdir(path.join(s.directory, 'Other', 'Exports'), { recursive: true });
  const configFile = path.join(s.directory, 'config.json');
  await fs.writeFile(
    configFile,
    JSON.stringify({ schemaVersion: 1, quietMs: 0, projects: [s.project, second] }),
  );
  const exportDeck = async (entry) => {
    if (entry === s.project.entry) throw new Error('Synthetic first-Project failure');
    const file = path.join(s.directory, 'Other', 'Exports', 'deck.pptx');
    await fs.writeFile(file, fixture);
    return { file, report: { pages: [{}] } };
  };
  const result = await runPublisher(configFile, { fingerprint: s.fingerprint, exportDeck });
  assert.equal(result.status, 'error');
  assert.deepEqual(
    result.results.map((item) => item.status),
    ['error', 'current'],
  );
  assert.equal(await fs.readFile(s.project.destination, 'utf8'), 'previous valid shared output');
  assert.deepEqual(await fs.readFile(second.destination), fixture);
  const state = JSON.parse(await fs.readFile(path.join(s.directory, 'state-v2.json'), 'utf8'));
  assert.equal(state.projects.other.slides, 1);
  assert.equal(state.projects.example.status, 'error');
});

test('a live publisher lock prevents overlapping runs', async (t) => {
  const s = await setup(t);
  const configFile = path.join(s.directory, 'config.json');
  await fs.writeFile(configFile, JSON.stringify({ schemaVersion: 1, projects: [s.project] }));
  await fs.writeFile(
    path.join(s.directory, 'publisher-v2.lock'),
    JSON.stringify({ pid: process.pid, owner: 'existing-run' }),
  );
  const result = await runPublisher(configFile, s);
  assert.equal(result.status, 'busy');
  assert.equal(s.exportCount(), 0);
  assert.equal(
    JSON.parse(await fs.readFile(path.join(s.directory, 'publisher-v2.lock'), 'utf8')).owner,
    'existing-run',
  );
});

test('two real processes recovering a crashed publisher cannot steal the winning lock', {
  timeout: 30000,
}, async (t) => {
  const s = await setup(t);
  const configFile = path.join(s.directory, 'config.json');
  await fs.writeFile(
    configFile,
    JSON.stringify({ schemaVersion: 1, quietMs: 0, projects: [s.project] }),
  );
  const workers = [];
  const spawnWorker = (label) => {
    const worker = publisherWorker(configFile, label);
    workers.push(worker);
    return worker;
  };
  try {
    const crashed = spawnWorker('crashed-owner');
    await crashed.wait('ready');
    crashed.send('go');
    await crashed.wait('export-entered');
    const lock = path.join(s.directory, 'publisher-v3.lock');
    const oldOwner = JSON.parse(await fs.readFile(path.join(lock, 'owner.json'), 'utf8'));
    await crashed.stop();

    const save = spawnWorker('save-trigger');
    const fallback = spawnWorker('scheduled-fallback');
    await Promise.all([save.wait('ready'), fallback.wait('ready')]);
    save.send('go');
    fallback.send('go');
    const observed = await Promise.all([
      save.wait('observed-dead-owner'),
      fallback.wait('observed-dead-owner'),
    ]);
    assert.deepEqual(
      observed.map((item) => item.owner),
      [oldOwner.owner, oldOwner.owner],
    );

    save.send('reap');
    await save.wait('export-entered');
    const activeOwner = await fs.readFile(path.join(lock, 'owner.json'), 'utf8');
    fallback.send('reap');
    assert.equal((await fallback.wait('result')).result.status, 'busy');
    assert.equal(await fs.readFile(path.join(lock, 'owner.json'), 'utf8'), activeOwner);
    assert.equal(
      fallback.messages.filter((message) => message.type === 'export-entered').length,
      0,
    );
    assert.equal(await fs.readFile(s.project.destination, 'utf8'), 'previous valid shared output');

    save.send('finish');
    assert.equal((await save.wait('result')).result.status, 'complete');
    assert.equal((await save.done).code, 0);
    assert.equal((await fallback.done).code, 0);
    assert.deepEqual(await fs.readFile(s.project.destination), fixture);
    await assert.rejects(fs.stat(lock), { code: 'ENOENT' });
    const retired = JSON.parse(
      await fs.readFile(
        path.join(s.directory, 'publisher-recovered-locks', oldOwner.owner, 'owner.json'),
        'utf8',
      ),
    );
    assert.equal(retired.pid, oldOwner.pid);
    assert.equal(
      (await fs.readdir(s.directory)).some(
        (name) => name.endsWith('.candidate') || name.endsWith('.released'),
      ),
      false,
    );
  } finally {
    await Promise.all(workers.map((worker) => worker.stop()));
  }
});

test('save-triggered scheduling uses explicit entries, a hidden process and the packaged Node host', async (t) => {
  const s = await setup(t);
  const configFile = path.join(s.directory, 'config.json');
  await fs.writeFile(configFile, JSON.stringify({ schemaVersion: 1, projects: [s.project] }));
  const calls = [];
  const scheduler = createPublisherScheduler({
    configFile,
    debounceMs: 60000,
    spawn: (...args) => {
      calls.push(args);
      const child = new EventEmitter();
      child.unref = () => {};
      return child;
    },
  });
  t.after(() => scheduler.dispose());
  scheduler.schedule(s.project.entry);
  scheduler.schedule(path.join(s.directory, 'Unconfigured', 'deck.pptd'));
  await scheduler.flush();
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1].slice(-2), ['--entry', s.project.entry]);
  assert.equal(calls[0][2].windowsHide, true);
  assert.equal(calls[0][2].stdio, 'ignore');
  assert.equal(calls[0][2].env.ELECTRON_RUN_AS_NODE, '1');
  scheduler.dispose();
  scheduler.schedule(s.project.entry);
  await scheduler.flush();
  assert.equal(calls.length, 1);
});
