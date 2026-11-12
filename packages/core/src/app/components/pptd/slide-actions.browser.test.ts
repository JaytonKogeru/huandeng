import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Browser, chromium, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const coreRoot = fileURLToPath(new URL('../../../../', import.meta.url)).replace(/\\/g, '/');
const harnessId = `${coreRoot}slide-actions-harness.js`;
const harness = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {SectionBrowser} from '/src/app/components/pptd/section-browser.tsx';
const makePage = (pageId, title, hidden = false) => ({
  pageId, shortCode: pageId.toUpperCase(), path: 'pages/' + pageId + '.page',
  state: 'active', pageRevision: 'sha256:p', renderRevision: 'sha256:r',
  metadata: {path: 'pages/' + pageId + '.page', state: 'active', hidden},
  data: {title, elements: []}
});
const main = [makePage('alpha', 'First slide'), makePage('beta', 'Second slide'),
  makePage('hidden', 'Hidden slide', true)];
const appearances = [
  {...main[0], occurrenceId: 'live', mainPosition: 1},
  {...main[0], occurrenceId: 'pinned', versionId: 'saved-version', mainPosition: 1},
  {...main[1], occurrenceId: 'second', mainPosition: 2}
];
window.calls = [];
function App() {
  const [presentation, setPresentation] = useState(false);
  const [display, setDisplay] = useState('thumbnails');
  const [disabled, setDisabled] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [selected, setSelected] = useState({pageId: 'alpha'});
  const record = (value) => window.calls.push({...value, selectedBefore: selected});
  const controls = [
    ['main', () => {setPresentation(false); setSelected({pageId: 'alpha'});}],
    ['presentation', () => {setPresentation(true); setSelected({pageId: 'alpha', occurrenceId: 'live'});}],
    ['outline', () => setDisplay('outline')], ['browse', () => setDisplay('thumbnails')],
    ['readonly', () => setReadOnly(true)], ['blocked', () => setDisabled(true)]
  ];
  return React.createElement(React.Fragment, null,
    React.createElement('nav', null, controls.map(([id, action]) =>
      React.createElement('button', {key: id, id, onClick: action}, id))),
    React.createElement('main', {id: 'browser'}, React.createElement(SectionBrowser, {
      pages: presentation ? appearances : main, sections: [], size: [960,540], theme: {},
      display, presentation, disabled, readOnly, currentPageId: selected.pageId,
      currentOccurrenceId: selected.occurrenceId,
      onSelect: (pageId, occurrenceId) => {record({action: 'select', pageId, occurrenceId}); setSelected({pageId, occurrenceId});},
      onEdit: (pageId, occurrenceId) => record({action: 'fallback-edit', pageId, occurrenceId}),
      onHistory: (pageId, occurrenceId) => record({action: 'fallback-history', pageId, occurrenceId}),
      onMove: (pageId, boundary) => record({action: 'move', pageId, boundary}),
      onManageSections: () => record({action: 'sections'}),
      onAction: (page, action) => record({action, pageId: page.pageId, occurrenceId: page.occurrenceId, versionId: page.versionId}),
      renderPageActivity: (page) => React.createElement('button', {
        'data-test-activity': page.occurrenceId ?? page.pageId,
        onClick: () => record({action: 'activity', pageId: page.pageId})
      }, 'ChatGPT is reviewing')
    }))
  );
}
createRoot(document.querySelector('#app')).render(React.createElement(App));
`;

let server: ViteDevServer;
let browser: Browser;
let baseUrl: string;
let cacheDir: string;

beforeAll(async () => {
  cacheDir = await mkdtemp(join(tmpdir(), 'huandeng-slide-actions-'));
  server = await createServer({
    root: coreRoot,
    cacheDir,
    configFile: false,
    optimizeDeps: { entries: [] },
    resolve: { alias: { '@': `${coreRoot}src/app` } },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'slide-actions-test',
        resolveId: (id) => (id === '/slide-actions-harness.js' ? harnessId : undefined),
        load: (id) => (id === harnessId ? harness : undefined),
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (req.url !== '/') return next();
            res.setHeader('Content-Type', 'text/html');
            res.end(`<!doctype html><html><head><style>
              body {font: 14px sans-serif; margin: 16px;}
              #browser {height: 600px; width: 850px; display: flex;}
              .hd-section-browser {display:flex; flex:1; min-height:0; flex-direction:column;}
              .hd-browser-scroll {flex:1; min-height:0; overflow:auto;}
              .hd-browser-grid {display:grid; grid-template-columns:repeat(3, 1fr); gap:16px;}
              .hd-browser-slide {display:flex; width:100%; flex-direction:column;}
              .hd-workspace-preview {width:100%; overflow:hidden;}
              .hd-browser-description {display:flex; flex-direction:column;}
              .hd-browser-moves {display:flex; gap:6px;}
              [role=menu] {background:white; border:1px solid #aaa; padding:6px; z-index:50;}
              [role=menuitem] {display:flex; align-items:center; gap:6px; padding:5px;}
              [role=menuitem][data-disabled] {color:#777;}
              [role=menuitem]:focus {background:#ddd; outline:2px solid #555;}
              svg {width:16px;height:16px;}
              .sr-only {position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);}
            </style></head><body><div id="app"></div>
            <script type="module" src="/slide-actions-harness.js"></script></body></html>`);
          });
        },
      },
    ],
  });
  await server.listen();
  baseUrl = server.resolvedUrls?.local[0] ?? '';
  browser = await chromium.launch({ headless: true });
}, 60_000);

afterAll(async () => {
  await browser?.close();
  await server?.close();
  if (cacheDir) await rm(cacheDir, { recursive: true, force: true });
});

async function freshPage() {
  const page = await browser.newPage({
    viewport: { width: 1100, height: 900 },
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  await page.goto(baseUrl);
  await page.locator('[data-hd-slide-more="beta"]').waitFor();
  return page;
}

function action(page: Page, name: string) {
  return page.locator(`[data-hd-slide-action="${name}"]`);
}

async function calls(page: Page) {
  return page.evaluate(() => (window as unknown as { calls: unknown[] }).calls);
}

async function organize(page: Page) {
  await page.locator('[data-hd-slide-organize]').hover();
  await action(page, 'duplicate').waitFor();
}

describe('page actions in Browse and Outline', () => {
  it('uses the clicked page without changing the previous selection when opening either menu', async () => {
    const page = await freshPage();
    try {
      await page.locator('[data-hd-browser-select="beta"]').click({ button: 'right' });
      await action(page, 'present').click();
      expect(await calls(page)).toEqual([
        { action: 'present', pageId: 'beta', selectedBefore: { pageId: 'alpha' } },
      ]);
      await page.locator('#outline').click();
      await page.locator('[data-hd-slide-more="beta"]').click();
      await action(page, 'story').click();
      expect((await calls(page)).at(-1)).toEqual({
        action: 'story',
        pageId: 'beta',
        selectedBefore: { pageId: 'alpha' },
      });
    } finally {
      await page.close();
    }
  }, 30_000);

  it('supports keyboard context menus, dismissal focus and preserved filtering', async () => {
    const page = await freshPage();
    try {
      await page.locator('[data-hd-browser-search]').fill('Second');
      const target = page.locator('[data-hd-browser-select="beta"]');
      await target.focus();
      await page.keyboard.press('Shift+F10');
      await page.locator('[data-hd-slide-menu="context"]').waitFor();
      await page.keyboard.press('Escape');
      await expect
        .poll(() => target.evaluate((node) => node === document.activeElement))
        .toBe(true);
      expect(await page.locator('[data-hd-browser-search]').inputValue()).toBe('Second');
      expect(await calls(page)).toEqual([]);
      await page.locator('[data-hd-slide-more="beta"]').click();
      await organize(page);
      expect(await action(page, 'move-up').getAttribute('aria-disabled')).toBe('true');
      expect(await action(page, 'move-down').getAttribute('aria-disabled')).toBe('true');
    } finally {
      await page.close();
    }
  }, 30_000);

  it('retains repeated occurrence and pinned identity, with explicit Main navigation', async () => {
    const page = await freshPage();
    try {
      await page.locator('#presentation').click();
      await page.locator('[data-hd-slide-more="pinned"]').click();
      expect(await action(page, 'open').innerText()).toContain('View pinned slide');
      expect(await action(page, 'remove').count()).toBe(0);
      expect(await page.locator('[data-hd-slide-organize]').count()).toBe(0);
      await action(page, 'history').click();
      expect((await calls(page)).at(-1)).toEqual({
        action: 'history',
        pageId: 'alpha',
        occurrenceId: 'pinned',
        versionId: 'saved-version',
        selectedBefore: { pageId: 'alpha', occurrenceId: 'live' },
      });
      await page.locator('[data-hd-slide-more="pinned"]').click();
      await action(page, 'go-main').click();
      expect((await calls(page)).at(-1)).toMatchObject({
        action: 'go-main',
        occurrenceId: 'pinned',
        versionId: 'saved-version',
      });
    } finally {
      await page.close();
    }
  }, 30_000);

  it('keeps read-only navigation available while preventing Main mutations', async () => {
    const page = await freshPage();
    try {
      await page.locator('#readonly').click();
      await page.locator('[data-hd-slide-more="beta"]').click();
      expect(await action(page, 'open').getAttribute('aria-disabled')).not.toBe('true');
      expect(await action(page, 'remove').getAttribute('aria-disabled')).toBe('true');
      await organize(page);
      for (const name of ['insert-before', 'insert-after', 'duplicate', 'move-up', 'move-down'])
        expect(await action(page, name).getAttribute('aria-disabled')).toBe('true');
    } finally {
      await page.close();
    }
  }, 30_000);

  it('blocks navigation with unfinished UI work but still copies the clicked Slide code', async () => {
    const page = await freshPage();
    try {
      await page.locator('#blocked').click();
      await page.locator('[data-hd-browser-select="beta"]').dblclick({ force: true });
      expect(await calls(page)).toEqual([]);
      await page.locator('[data-hd-slide-more="beta"]').click();
      expect(await action(page, 'open').getAttribute('aria-disabled')).toBe('true');
      expect(await action(page, 'history').getAttribute('aria-disabled')).toBe('true');
      await action(page, 'copy-code').click();
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('BETA');
      expect(await calls(page)).toEqual([]);
    } finally {
      await page.close();
    }
  }, 30_000);

  it('keeps Activity outside selection buttons and disables presenting hidden slides', async () => {
    const page = await freshPage();
    try {
      const activity = page.locator('[data-test-activity="beta"]');
      expect(await activity.evaluate((node) => !!node.parentElement?.closest('button'))).toBe(
        false,
      );
      await activity.click();
      expect(await calls(page)).toEqual([
        { action: 'activity', pageId: 'beta', selectedBefore: { pageId: 'alpha' } },
      ]);
      await page.locator('[data-hd-slide-more="hidden"]').click();
      expect(await action(page, 'present').getAttribute('aria-disabled')).toBe('true');
    } finally {
      await page.close();
    }
  }, 30_000);

  it('moves through existing boundaries and preserves edge restrictions', async () => {
    const page = await freshPage();
    try {
      await page.locator('[data-hd-slide-more="alpha"]').click();
      await organize(page);
      expect(await action(page, 'move-up').getAttribute('aria-disabled')).toBe('true');
      await action(page, 'move-down').click();
      expect((await calls(page)).at(-1)).toMatchObject({
        action: 'move',
        pageId: 'alpha',
        boundary: { beforePageId: 'hidden', afterPageId: 'beta' },
      });
    } finally {
      await page.close();
    }
  }, 30_000);
});
