import { fileURLToPath } from 'node:url';
import { type Browser, chromium, type Page } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const coreRoot = fileURLToPath(new URL('../../../../', import.meta.url)).replace(/\\/g, '/');
const harnessId = `${coreRoot}workspace-preview-harness.js`;
const harness = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SectionBrowser } from '/src/app/components/pptd/section-browser.tsx';
import { NotesPageView } from '/src/app/components/pptd/notes-page-view.tsx';
import { setUiLocale } from '/src/app/lib/huandeng-locale.ts';
const pages = Array.from({length: 36}, (_, index) => ({
  pageId: 'slide-' + index, occurrenceId: 'occurrence-' + index,
  versionId: index === 0 ? 'pinned-version' : undefined, mainPosition: index + 7,
  path: 'synthetic.page', state: 'active', pageRevision: 'sha256:p', renderRevision: 'sha256:r',
  metadata: {path: 'synthetic.page', state: 'active'},
  data: {title: index === 2 ? '' : 'Synthetic title ' + index, elements: index === 0 ? [{
    elementId: 'pinned-text', elementType: 'text', bounds: [20,20,400,50],
    content: {text: 'Pinned snapshot content', fontSize: 24}
  }] : []}
}));
const root = createRoot(document.querySelector('#app'));
const noop = () => {};
const props = {pages, sections: [], size: [960,540], theme: {}, currentPageId: 'slide-0',
  currentOccurrenceId: 'occurrence-0', presentation: true, disabled: false,
  onSelect: noop, onEdit: noop, onMove: noop, onManageSections: noop};
document.querySelector('#browse').onclick = () => root.render(React.createElement(SectionBrowser, props));
document.querySelector('#notes').onclick = () => root.render(React.createElement(NotesPageView, {
  page: pages[0], size: props.size, theme: props.theme, position: 1, count: pages.length,
  navigatingDisabled: false, onPrevious: noop, onNext: noop, value: '', disabled: true,
  presentation: true, onChange: noop, onComposition: noop, onEditOccurrence: noop
}));
document.querySelector('#unmount').onclick = () => root.render(null);
document.querySelector('#locale').onclick = () => setUiLocale('zh-CN');
document.querySelector('#update').onclick = () => root.render(React.createElement(SectionBrowser, {
  ...props, pages: pages.map((page, index) => index === 1 ? {
    ...page, data: {...page.data, title: 'Updated authored title'},
    metadata: {...page.metadata, designIntent: {purpose: 'Updated Story'}}
  } : page)
}));
document.querySelector('#browse').click();
`;

let server: ViteDevServer;
let browser: Browser;
let baseUrl: string;

beforeAll(async () => {
  server = await createServer({
    root: coreRoot,
    configFile: false,
    optimizeDeps: { entries: [] },
    resolve: { alias: { '@': `${coreRoot}src/app` } },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'workspace-preview-test',
        resolveId: (id) => (id === '/workspace-preview-harness.js' ? harnessId : undefined),
        load: (id) => (id === harnessId ? harness : undefined),
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (req.url !== '/') return next();
            res.setHeader('Content-Type', 'text/html');
            res.end(`<!doctype html><html><head><style>
              #app {height: 480px; width: 520px; display: flex;}
              .hd-section-browser {display:flex; flex:1; min-height:0; flex-direction:column;}
              .hd-browser-scroll {flex:1; min-height:0; overflow:auto;}
              .hd-browser-grid {display:grid; grid-template-columns:1fr 1fr; gap:16px;}
              .hd-browser-slide {display:flex; width:100%; flex-direction:column;}
              .hd-workspace-preview {width:100%; overflow:hidden;}
            </style></head><body><button id="browse">Browse</button><button id="notes">Notes</button>
            <button id="unmount">Unmount</button><button id="locale">Locale</button>
            <button id="update">Update</button><div id="app"></div>
            <script type="module" src="/workspace-preview-harness.js"></script></body></html>`);
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
});

async function eventually(check: () => Promise<boolean>) {
  await expect.poll(check, { timeout: 15_000 }).toBe(true);
}

function slide(page: Page, index: number) {
  return page.locator(`[data-hd-browser-card="occurrence-${index}"]`);
}

describe('workspace preview residency in a scrolling browser', () => {
  it('refreshes memoized titles, localized fallbacks and Story filtering after changes', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl);
      await eventually(async () => (await slide(page, 2).innerText()).includes('Untitled slide'));
      await page.locator('#locale').click();
      await eventually(async () => (await slide(page, 2).innerText()).includes('未命名幻灯片'));
      await page.locator('[data-hd-browser-search]').fill('Updated Story');
      await eventually(async () => (await page.locator('[data-hd-browser-card]').count()) === 0);
      await page.locator('#update').click();
      await eventually(async () =>
        (await slide(page, 1).innerText()).includes('Updated authored title'),
      );
      expect(await page.locator('[data-hd-browser-card]').count()).toBe(1);
    } finally {
      await page.close();
    }
  }, 45_000);

  it('observes the actual scroll viewport and cleans up on filtering, collapse and unmount', async () => {
    const page = await browser.newPage();
    try {
      await page.addInitScript(() => {
        const NativeObserver = window.IntersectionObserver;
        let active = 0;
        window.IntersectionObserver = class extends NativeObserver {
          private disconnected = false;
          constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
            super(callback, options);
            document.documentElement.dataset.previewObservers = String(++active);
            if (
              !(options?.root instanceof HTMLElement) ||
              !options.root.matches('[data-hd-browser-scroll]')
            )
              document.documentElement.dataset.wrongPreviewRoot = 'true';
          }
          disconnect() {
            super.disconnect();
            if (!this.disconnected) {
              document.documentElement.dataset.previewObservers = String(--active);
              this.disconnected = true;
            }
          }
        };
      });
      await page.goto(baseUrl);
      await eventually(
        async () => (await page.locator('html').getAttribute('data-preview-observers')) === '36',
      );
      expect(await page.locator('html').getAttribute('data-wrong-preview-root')).toBeNull();
      await page.locator('[data-hd-browser-search]').fill('Synthetic title 0');
      await eventually(
        async () => (await page.locator('html').getAttribute('data-preview-observers')) === '1',
      );
      await page.locator('[data-hd-browser-search]').fill('');
      await eventually(
        async () => (await page.locator('html').getAttribute('data-preview-observers')) === '36',
      );
      await page.locator('[data-hd-browser-collapse]').click();
      await eventually(
        async () => (await page.locator('html').getAttribute('data-preview-observers')) === '0',
      );
      await page.locator('[data-hd-browser-collapse]').click();
      await eventually(
        async () => (await page.locator('html').getAttribute('data-preview-observers')) === '36',
      );
      await page.locator('#notes').click();
      await eventually(
        async () => (await page.locator('html').getAttribute('data-preview-observers')) === '0',
      );
      expect(await page.locator('[data-pptd-page]').count()).toBe(1);
      await page.locator('#browse').click();
      await eventually(
        async () => (await page.locator('html').getAttribute('data-preview-observers')) === '36',
      );
      await page.locator('#unmount').click();
      await eventually(
        async () => (await page.locator('html').getAttribute('data-preview-observers')) === '0',
      );
    } finally {
      await page.close();
    }
  }, 45_000);

  it('releases offscreen renderers, restores pinned snapshots and keeps every card semantic', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl);
      await eventually(
        async () => (await slide(page, 0).locator('[data-pptd-page]').count()) === 1,
      );
      expect(await page.locator('[data-hd-browser-card]').count()).toBe(36);
      expect(await page.locator('[data-pptd-page]').count()).toBeLessThan(20);
      expect(await slide(page, 0).innerText()).toContain('Pinned version');
      await page.locator('[data-hd-browser-scroll]').evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      await eventually(
        async () => (await slide(page, 35).locator('[data-pptd-page]').count()) === 1,
      );
      await eventually(
        async () => (await slide(page, 0).locator('[data-pptd-page]').count()) === 0,
      );
      expect(await page.locator('[data-hd-browser-card]').count()).toBe(36);
      expect(await slide(page, 0).locator('button[aria-pressed="true"]').count()).toBe(1);
      expect(await slide(page, 0).innerText()).toContain('Main Position 7');
      await page.locator('[data-hd-browser-scroll]').evaluate((node) => {
        node.scrollTop = 0;
      });
      await eventually(
        async () => (await slide(page, 0).locator('[data-pptd-page]').count()) === 1,
      );
      expect(await slide(page, 0).locator('[data-pptd-page]').textContent()).toContain(
        'Pinned snapshot content',
      );
      await eventually(
        async () => (await slide(page, 35).locator('[data-pptd-page]').count()) === 0,
      );
      await page.locator('#notes').click();
      await eventually(
        async () => (await page.locator('[data-hd-notes-page] [data-pptd-page]').count()) === 1,
      );
    } finally {
      await page.close();
    }
  }, 45_000);

  it('renders safely when IntersectionObserver is unavailable', async () => {
    const page = await browser.newPage();
    try {
      await page.addInitScript(() => {
        Object.defineProperty(window, 'IntersectionObserver', { value: undefined });
      });
      await page.goto(baseUrl);
      await eventually(async () => (await page.locator('[data-pptd-page]').count()) === 36);
      await page.locator('#notes').click();
      await eventually(
        async () => (await page.locator('[data-hd-notes-page] [data-pptd-page]').count()) === 1,
      );
    } finally {
      await page.close();
    }
  }, 45_000);
});
