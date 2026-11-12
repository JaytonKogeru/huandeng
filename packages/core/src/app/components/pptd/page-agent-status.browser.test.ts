import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { type Browser, chromium } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { ActivityEvent, ActivitySnapshot } from '../../../pptd/activity';

interface HarnessWindow {
  pendingReads: unknown[];
  stats: {
    subscriptions: number;
    active: number;
    stops: number;
    opens: number;
    cardClicks: number;
  };
  emit: (event: Partial<ActivityEvent>) => void;
  connect: () => void;
  resolveRead: (index: number, snapshot: Partial<ActivitySnapshot>) => void;
  unmount: () => void;
}

const coreRoot = fileURLToPath(new URL('../../../../', import.meta.url)).replace(/\\/g, '/');
const harnessId = `${coreRoot}page-agent-status-harness.js`;
const harness = `
import '/src/app/styles.css';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useProjectActivity } from '/src/app/lib/use-project-activity.ts';
import { usePageAgentActivity } from '/src/app/lib/use-page-agent-activity.ts';
import { PageAgentStatus } from '/src/app/components/pptd/page-agent-status.tsx';
import { PptdActivityPanel } from '/src/app/components/pptd/activity-panel.tsx';
import { setUiLocale } from '/src/app/lib/huandeng-locale.ts';
await setUiLocale('en');
window.pendingReads = [];
window.stats = { subscriptions: 0, active: 0, stops: 0, opens: 0, cardClicks: 0 };
const listeners = new Set();
let sequence = 0;
const event = (values = {}) => ({
  deckId: 'deck-a', epoch: 'writer-a', sequence: ++sequence,
  requestId: 'request-' + sequence, sessionId: 'conversation-a', taskId: 'change-page',
  actor: 'Custom Review Assistant', status: 'running', source: 'client',
  summary: 'Inspecting the selected pages.', pageIds: ['page-a', 'page-b'],
  timestamp: new Date().toISOString(), ...values,
});
window.emit = values => {
  const next = event(values);
  for (const listener of listeners) listener.onEvent(next);
};
window.connect = () => {
  for (const listener of listeners) listener.onConnection(true);
};
window.resolveRead = (index, value) => window.pendingReads[index]({
  deckId: 'deck-a', epoch: 'writer-a', sequence: 0, events: [], retainedLimit: 300, ...value,
});
const backend = {
  activity: () => new Promise(resolve => window.pendingReads.push(resolve)),
  subscribeActivity: (onEvent, onConnection) => {
    const listener = { onEvent, onConnection };
    listeners.add(listener);
    window.stats.subscriptions++;
    window.stats.active++;
    return () => {
      listeners.delete(listener);
      window.stats.active--;
      window.stats.stops++;
    };
  },
};
const pageIds = ['page-a', 'page-b'];
const pageLabels = { 'page-a': 'First slide', 'page-b': 'Second slide' };
function App() {
  const activity = useProjectActivity(backend, 'deck-a');
  const pages = usePageAgentActivity(activity.snapshot, pageIds);
  const [panel, setPanel] = useState(false);
  return React.createElement(React.Fragment, null,
    React.createElement('output', { 'data-snapshot': true }, JSON.stringify({
      epoch: activity.snapshot?.epoch,
      sequences: activity.snapshot?.events.map(item => item.sequence),
      activeTasks: pages.activeTaskCount,
    })),
    ...pageIds.map(pageId => React.createElement('section', {
      key: pageId, 'data-card': pageId, onClick: () => window.stats.cardClicks++,
    }, React.createElement(PageAgentStatus, {
      items: pages.byPage[pageId] ?? [],
      onOpen: () => { window.stats.opens++; setPanel(true); },
    }))),
    panel && React.createElement(PptdActivityPanel, {
      activity, backend, deckId: 'deck-a', pageLabels,
      onClose: () => setPanel(false), onSelectPage: () => {}, onReview: () => {},
    }),
  );
}
const root = createRoot(document.querySelector('#app'));
window.unmount = () => root.unmount();
root.render(React.createElement(App));
`;

let server: ViteDevServer;
let browser: Browser;
let baseUrl: string;

beforeAll(async () => {
  server = await createServer({
    root: coreRoot,
    configFile: false,
    cacheDir: `${coreRoot}node_modules/.vite-page-agent-status`,
    optimizeDeps: {
      entries: [],
      include: [
        'react',
        'react-dom/client',
        'react/jsx-dev-runtime',
        'lucide-react',
        '@base-ui/react/button',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
      ],
    },
    resolve: { alias: { '@': `${coreRoot}src/app` }, dedupe: ['react', 'react-dom'] },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      tailwindcss(),
      {
        name: 'page-agent-status-test',
        resolveId: (id) => (id === '/page-agent-status-harness.js' ? harnessId : undefined),
        load: (id) => (id === harnessId ? harness : undefined),
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (req.url !== '/') return next();
            res.setHeader('Content-Type', 'text/html');
            res.end(
              '<!doctype html><html><body><div id="app"></div><script type="module" src="/page-agent-status-harness.js"></script></body></html>',
            );
          });
        },
      },
    ],
  });
  await server.listen();
  baseUrl = server.resolvedUrls?.local[0] ?? '';
  browser = await chromium.launch({ headless: true });
}, 30_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
});

describe('Shared per-page agent activity', () => {
  it('shares one subscription across pages and Activity, preserves unknown actors, and opens the badge once', async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5_000);
    try {
      await page.goto(baseUrl);
      await page.waitForFunction(
        () => (window as unknown as HarnessWindow).pendingReads?.length === 1,
      );
      await page.evaluate(() => {
        const value = window as unknown as HarnessWindow;
        value.resolveRead(0, {});
        value.emit({ agentFamily: 'other', actor: 'Custom Review Assistant' });
      });
      const badge = page.locator('[data-card="page-a"] [data-hd-agent-family="other"]');
      await badge.waitFor();
      expect(await badge.innerText()).toContain('Custom Review Assistant');
      expect(await badge.innerText()).toContain('Working');
      expect(await page.locator('[data-hd-agent-family="other"]').count()).toBe(2);
      await badge.click();
      await page.locator('[data-testid="project-activity"]').waitFor();
      expect(await page.evaluate(() => (window as unknown as HarnessWindow).stats)).toEqual({
        subscriptions: 1,
        active: 1,
        stops: 0,
        opens: 1,
        cardClicks: 0,
      });
      expect(
        await page.evaluate(() => (window as unknown as HarnessWindow).pendingReads.length),
      ).toBe(1);
      await page.getByRole('button', { name: 'Close Activity', exact: true }).click();
      await page.locator('[data-testid="project-activity"]').waitFor({ state: 'detached' });
      expect(await page.evaluate(() => (window as unknown as HarnessWindow).stats.active)).toBe(1);
      await page.evaluate(() => (window as unknown as HarnessWindow).unmount());
      expect(await page.evaluate(() => (window as unknown as HarnessWindow).stats)).toEqual({
        subscriptions: 1,
        active: 0,
        stops: 1,
        opens: 1,
        cardClicks: 0,
      });
    } finally {
      await page.close();
    }
  }, 30_000);

  it('does not let an old-epoch read or an older request overwrite a newer stream report', async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5_000);
    try {
      await page.goto(baseUrl);
      await page.waitForFunction(
        () => (window as unknown as HarnessWindow).pendingReads?.length === 1,
      );
      await page.evaluate(() =>
        (window as unknown as HarnessWindow).emit({
          epoch: 'writer-b',
          sequence: 10,
          agentFamily: 'claude',
          phase: 'validate',
        }),
      );
      await page.locator('[data-hd-agent-family="claude"]').first().waitFor();
      await page.evaluate(() =>
        (window as unknown as HarnessWindow).resolveRead(0, {
          epoch: 'writer-a',
          sequence: 9,
        }),
      );
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      expect(JSON.parse(await page.locator('[data-snapshot]').innerText())).toEqual({
        epoch: 'writer-b',
        sequences: [10],
        activeTasks: 1,
      });
      expect(await page.locator('[data-hd-agent-family="claude"]').first().innerText()).toContain(
        'Checking',
      );
      await page.evaluate(() => {
        const value = window as unknown as HarnessWindow;
        value.connect();
        value.connect();
      });
      await page.waitForFunction(
        () => (window as unknown as HarnessWindow).pendingReads.length === 3,
      );
      await page.evaluate(() =>
        (window as unknown as HarnessWindow).resolveRead(2, {
          epoch: 'writer-b',
          sequence: 10,
        }),
      );
      await page.evaluate(() =>
        (window as unknown as HarnessWindow).resolveRead(1, {
          epoch: 'writer-a',
          sequence: 9,
        }),
      );
      await page.evaluate(
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      expect(JSON.parse(await page.locator('[data-snapshot]').innerText())).toEqual({
        epoch: 'writer-b',
        sequences: [10],
        activeTasks: 1,
      });
      expect(
        await page.evaluate(() => (window as unknown as HarnessWindow).stats.subscriptions),
      ).toBe(1);
    } finally {
      await page.close();
    }
  }, 30_000);

  it('expires a running report after five minutes and removes a completed badge after two without new events', async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5_000);
    await page.clock.install({ time: new Date('2026-11-12T01:00:00Z') });
    try {
      await page.goto(baseUrl);
      await page.waitForFunction(
        () => (window as unknown as HarnessWindow).pendingReads?.length === 1,
      );
      await page.evaluate(() => {
        const value = window as unknown as HarnessWindow;
        value.resolveRead(0, {});
        value.emit({ agentFamily: 'chatgpt', phase: 'implement', pageIds: ['page-a'] });
      });
      const badge = page.locator('[data-card="page-a"] [data-hd-agent-family="chatgpt"]');
      await badge.waitFor();
      expect(await badge.getAttribute('data-hd-agent-status')).toBe('running');
      expect(await badge.innerText()).toContain('Editing');
      await page.clock.fastForward(299_000);
      expect(await badge.getAttribute('data-hd-agent-status')).toBe('running');
      await page.clock.fastForward(2_000);
      await page.locator('[data-hd-agent-status="stale"]').waitFor();
      expect(await badge.innerText()).toContain('Not recently updated');
      expect(JSON.parse(await page.locator('[data-snapshot]').innerText()).activeTasks).toBe(0);
      await page.evaluate(() =>
        (window as unknown as HarnessWindow).emit({
          agentFamily: 'chatgpt',
          status: 'completed',
          pageIds: undefined,
        }),
      );
      await page.locator('[data-hd-agent-status="completed"]').waitFor();
      expect(await badge.innerText()).toContain('Completed');
      await page.clock.fastForward(119_000);
      expect(await badge.count()).toBe(1);
      await page.clock.fastForward(2_000);
      await badge.waitFor({ state: 'detached' });
      expect(await page.locator('[data-hd-page-agent-status]').count()).toBe(0);
      expect(
        await page.evaluate(() => (window as unknown as HarnessWindow).stats.subscriptions),
      ).toBe(1);
      expect(
        await page.evaluate(() => (window as unknown as HarnessWindow).pendingReads.length),
      ).toBe(1);
    } finally {
      await page.close();
    }
  }, 30_000);
});
