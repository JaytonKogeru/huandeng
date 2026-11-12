import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { type Browser, chromium } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface SettingsHarness {
  changes: Record<string, unknown>[];
  current: { orientation: 'horizontal' | 'vertical'; collapsed: boolean };
  failSave: boolean;
  releaseRead: () => void;
  broadcast: (layout: SettingsHarness['current']) => void;
  controls: { notesDock: string; notes: boolean; reset: number; keyboard: number };
}

const coreRoot = fileURLToPath(new URL('../../../../', import.meta.url)).replace(/\\/g, '/');
const harnessId = `${coreRoot}workspace-settings-harness.js`;
const harness = `
import '/src/app/styles.css';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from 'next-themes';
import { WorkspaceSettings } from '/src/app/components/pptd/workspace-settings.tsx';
window.changes = [];
window.current = {orientation:'horizontal', collapsed:false};
window.failSave = false;
window.controls = {notesDock:'bottom',notes:false,reset:0,keyboard:0};
let listeners = new Set();
window.broadcast = layout => {window.current=layout;for(const callback of listeners) callback(layout);};
if (!location.search.includes('browser')) window.huandengDesktop = {
  getTabLayout: async () => {
    const initial = {...window.current};
    if (location.search.includes('hold')) await new Promise(resolve => {window.releaseRead=resolve;});
    return initial;
  },
  setTabLayout: async update => {
    if (window.failSave) throw new Error('Synthetic preference failure');
    window.changes.push(update);
    window.broadcast({...window.current,...update});
    return {...window.current};
  },
  onTabLayoutChanged: callback => {listeners.add(callback);return ()=>listeners.delete(callback);},
};
function App() {
  const [open,setOpen]=useState(true);
  const [navigation,setNavigation]=useState(true);
  const [inspector,setInspector]=useState(true);
  const [notes,setNotes]=useState(false);
  const [dock,setDock]=useState('bottom');
  const [snapping,setSnapping]=useState(true);
  const reset=()=>{window.controls.reset++;setNavigation(true);setInspector(true);setNotes(false);setDock('bottom');};
  return React.createElement(ThemeProvider,{attribute:'class',defaultTheme:'light'},
    React.createElement(WorkspaceSettings,{
      open,onOpenChange:setOpen,navigation,inspector,notes,notesDock:dock,
      onNavigation:setNavigation,onInspector:setInspector,
      onNotes:value=>{window.controls.notes=value;setNotes(value);},
      onNotesDock:value=>{window.controls.notesDock=value;setDock(value);},
      onReset:reset,onKeyboard:()=>window.controls.keyboard++,
      snapping:{enabled:snapping,disabled:false,onChange:setSnapping}
    }));
}
createRoot(document.querySelector('#app')).render(React.createElement(App));
`;

let server: ViteDevServer;
let browser: Browser;
let baseUrl: string;

beforeAll(async () => {
  server = await createServer({
    root: coreRoot,
    configFile: false,
    cacheDir: `${coreRoot}node_modules/.vite-workspace-settings`,
    optimizeDeps: { entries: [] },
    resolve: { alias: { '@': `${coreRoot}src/app` }, dedupe: ['react', 'react-dom'] },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      tailwindcss(),
      {
        name: 'workspace-settings-test',
        resolveId: (id) => (id === '/workspace-settings-harness.js' ? harnessId : undefined),
        load: (id) => (id === harnessId ? harness : undefined),
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (!req.url?.startsWith('/?') && req.url !== '/') return next();
            res.setHeader('Content-Type', 'text/html');
            res.end(
              '<!doctype html><html><body><div id="app"></div><script type="module" src="/workspace-settings-harness.js"></script></body></html>',
            );
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

describe('Workspace settings', () => {
  it('groups controls, preserves font preview and fits a small window in both languages', async () => {
    const page = await browser.newPage({ viewport: { width: 820, height: 600 } });
    try {
      await page.goto(baseUrl);
      await page.getByRole('button', { name: 'Across the top' }).waitFor();
      await page.getByRole('combobox', { name: 'Notes dock' }).selectOption('right');
      await page.getByRole('checkbox', { name: 'Speaker notes' }).check();
      expect(
        await page.evaluate(() => (window as unknown as SettingsHarness).controls),
      ).toMatchObject({
        notesDock: 'right',
        notes: true,
      });
      await page.getByRole('tab', { name: 'Fonts', exact: true }).click();
      await page.getByRole('combobox', { name: 'Preview font' }).selectOption({ index: 1 });
      const chosen = await page.getByRole('combobox', { name: 'Preview font' }).inputValue();
      await page.getByRole('tab', { name: 'Editing', exact: true }).click();
      expect(await page.locator('[data-hd-font-library]').isVisible()).toBe(false);
      await page.locator('[data-hd-snapping-toggle]').click();
      expect(await page.locator('[data-hd-snapping-toggle]').getAttribute('aria-pressed')).toBe(
        'false',
      );
      await page.getByRole('tab', { name: 'Fonts', exact: true }).click();
      expect(await page.getByRole('combobox', { name: 'Preview font' }).inputValue()).toBe(chosen);
      await page.getByRole('tab', { name: 'Workspace', exact: true }).click();
      await page.getByRole('combobox', { name: 'Interface theme' }).selectOption('dark');
      await expect.poll(() => page.locator('html').getAttribute('class')).toContain('dark');
      await page.getByRole('combobox', { name: 'Interface language' }).selectOption('zh-CN');
      await page.getByRole('dialog', { name: '工作区设置' }).waitFor();
      await page.getByRole('button', { name: '重置工作区布局' }).click();
      expect(await page.getByRole('combobox', { name: '备注停靠位置' }).inputValue()).toBe(
        'bottom',
      );
      expect(await page.getByRole('combobox', { name: '界面主题' }).inputValue()).toBe('dark');
      for (const width of [820, 390]) {
        await page.setViewportSize({ width, height: 600 });
        const sizes = await page.locator('[data-hd-workspace-settings]').evaluate((node) => ({
          x: node.getBoundingClientRect().x,
          right: node.getBoundingClientRect().right,
          bottom: node.getBoundingClientRect().bottom,
          client: node.clientWidth,
          scroll: node.scrollWidth,
        }));
        expect(sizes.x).toBeGreaterThanOrEqual(0);
        expect(sizes.right).toBeLessThanOrEqual(width);
        expect(sizes.bottom).toBeLessThanOrEqual(600);
        expect(sizes.scroll).toBeLessThanOrEqual(sizes.client);
      }
      await page.getByRole('button', { name: '关闭', exact: true }).click();
      await expect.poll(() => page.getByRole('dialog').count()).toBe(0);
    } finally {
      await page.close();
    }
  }, 45_000);

  it('shares desktop changes and keeps the last saved layout after a failed write', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl);
      const vertical = page.getByRole('button', { name: 'Down the left' });
      await vertical.click();
      await expect.poll(() => vertical.getAttribute('aria-pressed')).toBe('true');
      await page.getByRole('checkbox', { name: 'Collapse vertical tabs' }).check();
      expect(await page.evaluate(() => (window as unknown as SettingsHarness).current)).toEqual({
        orientation: 'vertical',
        collapsed: true,
      });
      await page.evaluate(() => {
        (window as unknown as SettingsHarness).failSave = true;
      });
      await page.getByRole('button', { name: 'Across the top' }).click();
      await page.getByRole('alert').waitFor();
      expect(await vertical.getAttribute('aria-pressed')).toBe('true');
      expect(await page.getByRole('alert').innerText()).toContain('could not be saved');
      await page.evaluate(() => {
        const harness = window as unknown as SettingsHarness;
        harness.broadcast({ orientation: 'horizontal', collapsed: true });
      });
      await expect
        .poll(() =>
          page.getByRole('button', { name: 'Across the top' }).getAttribute('aria-pressed'),
        )
        .toBe('true');
      expect(await page.getByRole('checkbox', { name: 'Collapse vertical tabs' }).count()).toBe(0);
    } finally {
      await page.close();
    }
  }, 30_000);

  it('ignores an old initial read after a newer desktop broadcast', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${baseUrl}?hold`);
      await page.getByText('Loading tab preferences…').waitFor();
      await page.evaluate(() => {
        const harness = window as unknown as SettingsHarness;
        harness.broadcast({ orientation: 'vertical', collapsed: false });
        harness.releaseRead();
      });
      await expect
        .poll(() =>
          page.getByRole('button', { name: 'Down the left' }).getAttribute('aria-pressed'),
        )
        .toBe('true');
      expect(await page.getByRole('checkbox', { name: 'Collapse vertical tabs' }).isChecked()).toBe(
        false,
      );
    } finally {
      await page.close();
    }
  }, 30_000);

  it('keeps ordinary workspace controls available outside the desktop host', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(`${baseUrl}?browser`);
      await page.getByRole('dialog').waitFor();
      expect(await page.locator('[data-hd-tab-settings]').count()).toBe(0);
      expect(await page.getByRole('combobox', { name: 'Notes dock' }).isVisible()).toBe(true);
      await page.getByRole('tab', { name: 'Editing', exact: true }).click();
      await page.getByRole('button', { name: 'Keyboard shortcuts' }).click();
      expect(
        await page.evaluate(() => (window as unknown as SettingsHarness).controls.keyboard),
      ).toBe(1);
    } finally {
      await page.close();
    }
  }, 30_000);
});
