import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { type Browser, chromium } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const coreRoot = fileURLToPath(new URL('../../../', import.meta.url)).replace(/\\/g, '/');
const harnessId = `${coreRoot}rich-clipboard-harness.js`;
const harness = `
import '/src/app/styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { PptdPageRenderer } from '/src/app/components/pptd/renderer.tsx';
import { renderSelectionPng, writeRichSelection } from '/src/app/lib/pptd-rich-clipboard.ts';
const shape = {elementId:'red',elementType:'shape',shapeName:'rect',bounds:[60,50,120,80],fill:{type:'solid',color:'#bf4030'},border:{width:0,color:'#bf4030'}};
const image = {elementId:'image',elementType:'image',bounds:[205,110,80,60],src:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aA1cAAAAASUVORK5CYII=',fit:{mode:'fill'}};
const elements = [shape,image];
const page = {
  pageId:'page-test-1',
  path:'pages/page.page',
  pageRevision:'rev',
  renderRevision:'render',
  data:{elements,notes:''},
  metadata:{},
  state:'active',
};
window.copied = [];
window.huandengDesktop = {writeRichClipboard: async value => window.copied.push(value)};
const root = createRoot(document.getElementById('frame'));
root.render(React.createElement(PptdPageRenderer,{page,size:[320,240],assetUrl:(value)=>value}));
window.raster = async (ids=['red']) => {
  const blob = await renderSelectionPng(page.pageId,elements,new Set(ids),[320,240]);
  const bitmap = await createImageBitmap(blob);
  const canvas=document.createElement('canvas');
  canvas.width=bitmap.width;canvas.height=bitmap.height;
  const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0);
  const get=(x,y)=>[...ctx.getImageData(x,y,1,1).data];
  return {blob,width:bitmap.width,height:bitmap.height,corner:get(0,0),center:get(120,90),type:blob.type};
};
window.richCopy = async () => {
  const result=await window.raster(['red','image']);
  const json=JSON.stringify({kind:'huandeng-elements',deckId:'demo',elements,selectedIds:['red','image']});
  await writeRichSelection(json,result.blob);
  return {type:window.copied[0].mode,bytes:window.copied[0].pngBase64.length,kind:JSON.parse(window.copied[0].json).kind};
};
`;
let server: ViteDevServer;
let browser: Browser;
let baseUrl: string;
beforeAll(async () => {
  server = await createServer({
    root: coreRoot,
    configFile: false,
    cacheDir: `${coreRoot}node_modules/.vite-rich-clipboard`,
    optimizeDeps: { entries: [] },
    resolve: { alias: { '@': `${coreRoot}src/app` }, dedupe: ['react', 'react-dom'] },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      tailwindcss(),
      {
        name: 'clipboard-browser-harness',
        resolveId: (id) => (id === '/rich-clipboard-harness.js' ? harnessId : undefined),
        load: (id) => (id === harnessId ? harness : undefined),
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (req.url !== '/') return next();
            res.setHeader('Content-Type', 'text/html');
            res.end(
              '<!doctype html><html><body><div id="frame" data-hd-editor-canvas style="width:320px;height:240px"></div><script type="module" src="/rich-clipboard-harness.js"></script></body></html>',
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
describe('rich HUANDENG clipboard in Chromium', () => {
  it('rasterises only selected slide objects with transparent corners', async () => {
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error('CLIPBOARD_BROWSER_PAGE_ERROR', error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('CLIPBOARD_BROWSER_CONSOLE', msg.text());
    });
    page.on('requestfailed', (request) =>
      console.error('CLIPBOARD_REQUEST_FAILED', request.url(), request.failure()?.errorText),
    );
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await page.locator('[data-pptd-page]').waitFor({ timeout: 9000 });
      const result = await page.evaluate(async () => {
        const value = await (
          window as unknown as {
            raster: () => Promise<{
              width: number;
              height: number;
              corner: number[];
              center: number[];
              type: string;
            }>;
          }
        ).raster();
        return {
          width: value.width,
          height: value.height,
          corner: value.corner,
          center: value.center,
          type: value.type,
        };
      });
      expect(result.type).toBe('image/png');
      expect(result.width).toBe(260);
      expect(result.height).toBe(180);
      expect(result.corner[3]).toBe(0);
      expect(result.center[3]).toBeGreaterThan(200);
    } finally {
      await page.close();
    }
  }, 30_000);
  it('rasterises imported PNG media as visible pixels rather than a blank image', async () => {
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error('CLIPBOARD_BROWSER_PAGE_ERROR', error.message));
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await page.locator('[data-pptd-page]').waitFor({ timeout: 9000 });
      const result = await page.evaluate(async () =>
        (
          window as unknown as {
            raster: (
              ids: string[],
            ) => Promise<{ width: number; height: number; center: number[]; type: string }>;
          }
        ).raster(['image']),
      );
      expect(result.width).toBe(180);
      expect(result.height).toBe(140);
      expect(result.type).toBe('image/png');
      expect(result.center[3]).toBeGreaterThan(100);
    } finally {
      await page.close();
    }
  }, 30_000);

  it('writes both PNG and editable JSON through the desktop bridge', async () => {
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error('CLIPBOARD_BROWSER_PAGE_ERROR', error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.error('CLIPBOARD_BROWSER_CONSOLE', msg.text());
    });
    page.on('requestfailed', (request) =>
      console.error('CLIPBOARD_REQUEST_FAILED', request.url(), request.failure()?.errorText),
    );
    try {
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await page.locator('[data-pptd-page]').waitFor({ timeout: 9000 });
      const result = await page.evaluate(() =>
        (
          window as unknown as {
            richCopy: () => Promise<{ type: string; bytes: number; kind: string }>;
          }
        ).richCopy(),
      );
      expect(result.type).toBe('rich');
      expect(result.bytes).toBeGreaterThan(100);
      expect(result.kind).toBe('huandeng-elements');
    } finally {
      await page.close();
    }
  }, 30_000);
});
