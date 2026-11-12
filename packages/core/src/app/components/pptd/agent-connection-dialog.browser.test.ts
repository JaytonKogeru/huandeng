import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { type Browser, chromium } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface HarnessWindow {
  copies: string[];
  reports: Record<string, unknown>[];
  reviewed: string[];
  failSetup: boolean;
  holdClient: string | null;
  deepSeekRoute: 'plugin' | 'direct';
  releaseSetup?: () => void;
  project: string;
  dialogClosed: boolean;
  setLocale: (locale: string) => Promise<void>;
  renderDialog: () => void;
}

const coreRoot = fileURLToPath(new URL('../../../../', import.meta.url)).replace(/\\/g, '/');
const harnessId = `${coreRoot}agent-connection-harness.js`;
const harness = `
import '/src/app/styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AgentConnectionDialog } from '/src/app/components/pptd/agent-connection-dialog.tsx';
import { setUiLocale } from '/src/app/lib/huandeng-locale.ts';
window.copies = [];
window.reports = [];
window.reviewed = [];
window.failSetup = false;
window.holdClient = null;
window.deepSeekRoute = 'direct';
window.project = 'one';
Object.defineProperty(navigator, 'clipboard', {value: {writeText: async text => {window.copies.push(text);}}});
window.huandengDesktop = {getAgentConfiguration: async client => {
  const project = window.project;
  if (window.failSetup) throw new Error('Synthetic setup failure');
  if (window.holdClient === client) await new Promise(resolve => {window.releaseSetup = resolve;});
  return {client, route: client === 'deepseek' ? window.deepSeekRoute : undefined,
    entryPath: 'D:/' + project + '/deck.pptd', pluginPath: 'D:/plugin',
    configuration: 'exact\\n' + client + '/' + project};
}};
const backend = {activity: async () => ({deckId: window.project, events: window.reports}), subscribeActivity: () => () => {}};
const root = createRoot(document.querySelector('#app'));
window.renderDialog = () => root.render(React.createElement(AgentConnectionDialog, {
  open: true, onOpenChange: value => {window.dialogClosed = !value;}, backend,
  deckId: window.project, projectTitle: 'Authored ' + window.project,
  onReview: id => window.reviewed.push(id),
}));
window.setLocale = setUiLocale;
window.renderDialog();
`;

let server: ViteDevServer;
let browser: Browser;
let baseUrl: string;

beforeAll(async () => {
  server = await createServer({
    root: coreRoot,
    configFile: false,
    cacheDir: `${coreRoot}node_modules/.vite-agent-connection`,
    optimizeDeps: { entries: [] },
    resolve: { alias: { '@': `${coreRoot}src/app` }, dedupe: ['react', 'react-dom'] },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      tailwindcss(),
      {
        name: 'agent-connection-test',
        resolveId: (id) => (id === '/agent-connection-harness.js' ? harnessId : undefined),
        load: (id) => (id === harnessId ? harness : undefined),
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (req.url !== '/') return next();
            res.setHeader('Content-Type', 'text/html');
            res.end(
              '<!doctype html><html><body><div id="app"></div><script type="module" src="/agent-connection-harness.js"></script></body></html>',
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

describe('Assistant setup interactions', () => {
  it('shows independent client reports and opens only the selected exact receipt', async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5_000);
    try {
      await page.goto(baseUrl);
      await page.locator('[data-hd-agent-setup-ready]').waitFor({ timeout: 20_000 });
      await page.evaluate(() => {
        const harness = window as unknown as HarnessWindow;
        harness.project = 'reports';
        const base = {
          deckId: 'reports',
          epoch: 'epoch',
          timestamp: '2026-11-11T00:00:00Z',
          status: 'running',
          taskId: 'task',
          requestId: 'request',
          summary: 'Declared task',
        };
        harness.reports = [
          {
            ...base,
            sequence: 1,
            source: 'client',
            actor: 'Claude Code',
            sessionId: 'claude',
            operationIds: ['claimed-receipt'],
          },
          {
            ...base,
            sequence: 2,
            source: 'client',
            actor: 'DeepSeek Harness',
            sessionId: 'deepseek',
          },
          {
            ...base,
            sequence: 3,
            source: 'writer',
            actor: 'Shared writer',
            sessionId: 'writer',
            status: 'completed',
            summary: 'Saved 1 Slide',
            operationId: 'saved-receipt',
          },
        ];
        harness.renderDialog();
      });
      await page
        .locator('[data-hd-client-report]')
        .filter({ hasText: 'DeepSeek Harness' })
        .waitFor();
      expect(await page.locator('[data-hd-client-report]').count()).toBe(2);
      expect(await page.locator('[data-hd-saved-evidence]').innerText()).toContain(
        'Slides saved: 1',
      );
      await page.locator('[data-hd-saved-receipt="saved-receipt"]').click();
      expect(await page.evaluate(() => (window as unknown as HarnessWindow).reviewed)).toEqual([
        'saved-receipt',
      ]);
      expect(await page.evaluate(() => (window as unknown as HarnessWindow).dialogClosed)).toBe(
        true,
      );
    } finally {
      await page.close();
    }
  }, 30_000);

  it('copies exact configuration and a read-only task, keeps advanced closed, and localizes close', async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5_000);
    page.on('pageerror', (error) => console.error(error.message));
    try {
      await page.goto(baseUrl);
      await page.locator('[data-hd-agent-setup-ready]').waitFor({ timeout: 20_000 });
      expect(await page.locator('[data-hd-agent-project]').innerText()).toContain('Authored one');
      expect(await page.locator('[data-hd-agent-advanced]').getAttribute('open')).toBeNull();
      expect(await page.locator('textarea').isVisible()).toBe(false);
      for (const client of ['deepseek', 'codex', 'claude', 'chatgpt']) {
        await page.getByRole('combobox').selectOption(client);
        await page.locator('[data-hd-copy-agent-config]').click();
        await page.waitForFunction(
          (value) => (window as unknown as HarnessWindow).copies.at(-1) === value,
          `exact\n${client}/one`,
        );
        expect(await page.locator('[data-hd-agent-advanced]').getAttribute('open')).toBeNull();
      }
      await page.locator('[data-hd-copy-agent-task]').click();
      await page.waitForFunction(() =>
        (window as unknown as HarnessWindow).copies.at(-1)?.includes('Expected Project ID: one'),
      );
      expect(await page.locator('[data-hd-agent-report]').innerText()).toContain(
        'not a live connection or execution check',
      );
      await page.evaluate(() => (window as unknown as HarnessWindow).setLocale('zh-CN'));
      await page.getByRole('button', { name: '关闭', exact: true }).waitFor();
      expect(await page.locator('[data-hd-agent-next-steps]').innerText()).toContain(
        '接下来这样做',
      );
      await page.getByText('高级 · 查看完整配置', { exact: true }).click();
      expect(await page.locator('textarea').inputValue()).toBe('exact\nchatgpt/one');
      await page.getByRole('button', { name: '关闭', exact: true }).click();
      expect(await page.evaluate(() => (window as unknown as HarnessWindow).dialogClosed)).toBe(
        true,
      );
    } finally {
      await page.close();
    }
  }, 30_000);

  it('uses one DeepSeek option and needs no configuration copy for an installed native bundle', async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5_000);
    try {
      await page.goto(baseUrl);
      await page.locator('[data-hd-agent-setup-ready]').waitFor({ timeout: 20_000 });
      expect(await page.locator('option[value="deepseek"]').count()).toBe(1);
      expect(await page.locator('option[value="deepseek-native"]').count()).toBe(0);
      await page.evaluate(() => {
        (window as unknown as HarnessWindow).deepSeekRoute = 'plugin';
      });
      await page.getByRole('combobox').selectOption('deepseek');
      await page.locator('[data-hd-dsh-native-ready]').waitFor();
      expect(await page.locator('[data-hd-copy-agent-config]').count()).toBe(0);
      expect(await page.locator('[data-hd-agent-next-steps]').innerText()).toContain(
        'discovers open Projects automatically',
      );
      await page.locator('[data-hd-copy-agent-task]').click();
      await page.waitForFunction(() =>
        (window as unknown as HarnessWindow).copies.at(-1)?.includes('Expected Project ID: one'),
      );
      await page.getByText('Advanced · configuration details').click();
      expect(await page.locator('textarea').inputValue()).toBe('exact\ndeepseek/one');
      await page.getByRole('combobox').selectOption('codex');
      await page.evaluate(() => {
        (window as unknown as HarnessWindow).deepSeekRoute = 'direct';
      });
      await page.getByRole('combobox').selectOption('deepseek');
      await page.locator('[data-hd-copy-agent-config]').waitFor();
      expect(await page.locator('[data-hd-dsh-native-ready]').count()).toBe(0);
    } finally {
      await page.close();
    }
  }, 30_000);

  it('discards a delayed old-project response and permits retry after generation failure', async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(5_000);
    page.on('pageerror', (error) => console.error(error.message));
    try {
      await page.goto(baseUrl);
      await page.locator('[data-hd-agent-setup-ready]').waitFor({ timeout: 20_000 });
      await page.evaluate(() => {
        (window as unknown as HarnessWindow).holdClient = 'codex';
      });
      await page.getByRole('combobox').selectOption('codex');
      await page.waitForFunction(() => !!(window as unknown as HarnessWindow).releaseSetup);
      await page.evaluate(() => {
        const harness = window as unknown as HarnessWindow;
        harness.project = 'two';
        harness.holdClient = null;
        harness.renderDialog();
      });
      await page.locator('[data-hd-agent-project]').filter({ hasText: 'Authored two' }).waitFor();
      await page.evaluate(() => (window as unknown as HarnessWindow).releaseSetup?.());
      await page.locator('[data-hd-copy-agent-config]').click();
      await page.waitForFunction(
        () => (window as unknown as HarnessWindow).copies.at(-1) === 'exact\ncodex/two',
      );
      expect(await page.locator('[data-hd-agent-project]').innerText()).not.toContain('D:/one');
      await page.evaluate(() => {
        (window as unknown as HarnessWindow).failSetup = true;
      });
      await page.getByRole('combobox').selectOption('claude');
      await page.getByRole('alert').filter({ hasText: 'Synthetic setup failure' }).waitFor();
      expect(await page.locator('[data-hd-copy-agent-config]').count()).toBe(0);
      await page.evaluate(() => {
        (window as unknown as HarnessWindow).failSetup = false;
      });
      await page.getByRole('button', { name: 'Retry', exact: true }).click();
      await page.locator('[data-hd-copy-agent-config]').click();
      await page.waitForFunction(
        () => (window as unknown as HarnessWindow).copies.at(-1) === 'exact\nclaude/two',
      );
    } finally {
      await page.close();
    }
  }, 30_000);
});
