import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { type Browser, chromium } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface HarnessWindow {
  calls: string[];
  videoCalls: number;
  failSave: boolean;
  blocked: boolean;
  finish: () => void;
  renderDialog: () => void;
  setLocale: (locale: string) => Promise<void>;
}

const coreRoot = fileURLToPath(new URL('../../../../', import.meta.url)).replace(/\\/g, '/');
const harnessId = `${coreRoot}project-archive-harness.js`;
const harness = `
import '/src/app/styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ExportDialog } from '/src/app/components/pptd/export-dialog.tsx';
import { setUiLocale } from '/src/app/lib/huandeng-locale.ts';
await setUiLocale('en');
const page = {pageId:'a',path:'pages/a.page',pageRevision:'sha256:a',renderRevision:'sha256:r',
 state:'active',shortCode:'AAAA',metadata:{path:'pages/a.page',state:'active'},data:{elements:[]}};
const snapshot = {kind:'pptd',deckId:'project',entry:'D:/Users/example/project/研究介绍.pptd',title:'Selected short talk',
 presentationId:'short',pages:[page],size:[960,540],manifest:{pages:['pages/a.page']},
 metadata:{entry:'研究介绍.pptd',slides:{a:page.metadata}},diagnostics:[],writable:false};
window.calls=[];window.videoCalls=0;window.failSave=false;window.blocked=false;
let job = {id:'archive',format:'zip',state:'preparing',completedFrames:0,totalFrames:0,createdAt:Date.now(),
 files:{completedFiles:2,totalFiles:9,completedBytes:100,totalBytes:1000}};
window.finish=()=>{job={...job,state:'completed',finishedAt:Date.now(),result:{fileName:'研究介绍-project.zip',
 url:'/__pptd/exports/archive/download',reportUrl:'/__pptd/exports/archive/report',report:{format:'zip'}}};};
const backend = {
 videoCapabilities:async()=>{window.videoCalls++;return {available:true,formats:['mp4']};},
 startProjectArchive:async(...args)=>{window.calls.push('archive:'+args.length);return job;},
 exportStatus:async()=>job,
 cancelExport:async id=>{window.calls.push('cancel:'+id);job={...job,state:'cancelled',finishedAt:Date.now()};return job;}
};
const root=createRoot(document.querySelector('#app'));
window.renderDialog=()=>root.render(React.createElement(ExportDialog,{
 open:true,onOpenChange:()=>{},backend,snapshot,page,blocked:window.blocked,
 beforeExport:async()=>{window.calls.push('save');if(window.failSave)throw new Error('Synthetic save failure');},
 onReport:()=>{},onBusyChange:()=>{}
}));
window.setLocale=setUiLocale;
window.renderDialog();
`;

let server: ViteDevServer;
let browser: Browser;
let baseUrl: string;
beforeAll(async () => {
  server = await createServer({
    root: coreRoot,
    configFile: false,
    cacheDir: `${coreRoot}node_modules/.vite-project-archive`,
    optimizeDeps: { entries: [] },
    resolve: { alias: { '@': `${coreRoot}src/app` }, dedupe: ['react', 'react-dom'] },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      tailwindcss(),
      {
        name: 'project-archive-test',
        resolveId: (id) => (id === '/project-archive-harness.js' ? harnessId : undefined),
        load: (id) => (id === harnessId ? harness : undefined),
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (req.url !== '/') return next();
            res.setHeader('Content-Type', 'text/html');
            res.end(
              '<!doctype html><html><body><div id="app"></div><script type="module" src="/project-archive-harness.js"></script></body></html>',
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

describe('Project ZIP dialog', () => {
  it('uses entire-Project scope from a selected Presentation and shows file progress and download', async () => {
    const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
    try {
      await page.goto(baseUrl);
      const dialog = page.locator('[data-hd-export-dialog]');
      await dialog.waitFor({ timeout: 20000 });
      await dialog.getByRole('combobox').nth(0).selectOption('zip');
      expect(await dialog.getByRole('combobox').nth(1).inputValue()).toBe('project');
      expect(await dialog.getByRole('combobox').nth(1).isDisabled()).toBe(true);
      expect(await dialog.locator('[data-hd-project-archive-scope]').innerText()).toContain(
        '研究介绍.pptd',
      );
      expect(await dialog.locator('[data-hd-project-archive-scope]').innerText()).not.toContain(
        'D:/',
      );
      expect(await page.evaluate(() => (window as unknown as HarnessWindow).videoCalls)).toBe(0);
      await dialog.getByRole('button', { name: 'Start export', exact: true }).click();
      await expect
        .poll(() => page.evaluate(() => (window as unknown as HarnessWindow).calls))
        .toEqual(['save', 'archive:0']);
      await expect
        .poll(() => dialog.locator('[data-hd-export-progress]').innerText())
        .toContain('2 / 9 files');
      expect(await dialog.locator('progress').getAttribute('aria-label')).toBe(
        'Project archive progress',
      );
      const bounds = await dialog.boundingBox();
      expect(bounds?.width).toBeLessThanOrEqual(800);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.evaluate(() => (window as unknown as HarnessWindow).finish());
      await dialog.locator('[data-hd-export-result]').waitFor();
      expect(await dialog.locator('[download]').getAttribute('href')).toBe(
        '/__pptd/exports/archive/download',
      );
      expect(await dialog.locator('[download]').getAttribute('download')).toBe(
        '研究介绍-project.zip',
      );
    } finally {
      await page.close();
    }
  }, 20_000);

  it('keeps the save guard, translates the handoff scope and cancels an archive', async () => {
    const page = await browser.newPage({ viewport: { width: 720, height: 580 } });
    try {
      await page.goto(baseUrl);
      const dialog = page.locator('[data-hd-export-dialog]');
      await dialog.waitFor({ timeout: 20000 });
      await page.evaluate(async () => {
        const harness = window as unknown as HarnessWindow;
        await harness.setLocale('zh-CN');
        harness.blocked = true;
        harness.renderDialog();
      });
      await dialog.getByRole('combobox').nth(0).selectOption('zip');
      expect(await dialog.getByRole('button', { name: '开始导出', exact: true }).isDisabled()).toBe(
        true,
      );
      expect(await dialog.locator('[data-hd-project-archive-scope]').innerText()).toContain(
        '命名版本',
      );
      await page.evaluate(() => {
        const harness = window as unknown as HarnessWindow;
        harness.blocked = false;
        harness.failSave = true;
        harness.renderDialog();
      });
      await dialog.getByRole('button', { name: '开始导出', exact: true }).click();
      await dialog.getByRole('alert').waitFor();
      expect(await page.evaluate(() => (window as unknown as HarnessWindow).calls)).toEqual([
        'save',
      ]);
      await page.evaluate(() => {
        (window as unknown as HarnessWindow).failSave = false;
      });
      await dialog.getByRole('button', { name: '开始导出', exact: true }).click();
      await dialog.getByRole('button', { name: '取消导出', exact: true }).click();
      await expect
        .poll(() => page.evaluate(() => (window as unknown as HarnessWindow).calls))
        .toContain('cancel:archive');
      await expect
        .poll(() => dialog.locator('[data-hd-export-progress]').innerText())
        .toContain('已取消');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    } finally {
      await page.close();
    }
  }, 20_000);
});
