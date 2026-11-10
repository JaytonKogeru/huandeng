import { fileURLToPath } from 'node:url';
import { type Browser, chromium } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface HarnessWindow {
  calls: string[];
  busy: boolean[];
  composing: boolean[];
  releasePreview: () => void;
  failRecord: () => void;
  holdCheckpoints: boolean;
  failHistory: () => void;
}

const coreRoot = fileURLToPath(new URL('../../../../', import.meta.url)).replace(/\\/g, '/');
const harnessId = `${coreRoot}workspace-preview-harness.js`;
const harness = `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ProjectPanel } from '/src/app/components/pptd/project-panel.tsx';
import { PageHistoryWorkspace } from '/src/app/components/pptd/page-history-workspace.tsx';
const pages = [0,1,2].map(i => ({pageId:'p'+i, path:'p'+i+'.page', state:'active',
 pageRevision:'sha256:p'+i, renderRevision:'sha256:r'+i, shortCode:'ABC'+i,
 metadata:{path:'p'+i+'.page', state:'active'}, data:{title:'Page '+i,elements:[]}}));
const snapshot = {deckId:'test',title:'Test',size:[960,540],manifest:{theme:{}},pages,
 writable:true,metadataRevision:'sha256:meta',manifestRevision:'sha256:manifest',
 metadata:{project:{schemaVersion:1,mainStory:{purpose:'',audience:'',takeaway:''},
 sections:[{id:'alpha',title:'Alpha',startPageId:'p0',pageIds:[]},{id:'beta',title:'Beta',startPageId:'p2',pageIds:[]}],presentations:[]}}};
const app = document.querySelector('#app');
app.innerHTML='<div id="sidebar" hidden></div><div id="central"></div>';
const root=createRoot(document.querySelector('#sidebar'));
const central=document.querySelector('#central');
const noop=()=>{};
window.calls=[];window.busy=[];window.composing=[];
document.querySelector('#sections').onclick=()=> root.render(React.createElement(ProjectPanel,{
 snapshot,currentPageId:'p0',selectedPresentationId:null,onSelectPresentation:noop,onSelectPage:noop,
 onApply:async()=>{},sectionsTarget:central,onCloseSections:noop,onManageSections:noop,
 sectionEditorRequest:{key:1,sectionId:'alpha'}}));
const versions = ['a','b','c'].map(versionId=>({versionId,kind:'checkpoint',summary:versionId,
 actor:'test',createdAt:'2026-11-10T00:00:00Z',pageRevision:'sha256:'+versionId,current:false}));
const backend={pageHistory:async(_pageId,view)=>{
 if(view==='checkpoints' && window.holdCheckpoints) await new Promise((resolve,reject)=>{window.failHistory=()=>reject(new Error('Synthetic history failure'));});
 return view==='operations' ? [{...versions[0],versionId:'operation',kind:'edit',summary:'element.patch'}] : versions;
},pageVersion: async (pageId,versionId)=>{
 if(versionId==='b') await new Promise(resolve=>{window.releasePreview=resolve});
 return {version:versions.find(v=>v.versionId===versionId) ?? {...versions[0],versionId},page:pages[0],size:[960,540],assets:'archived'};
}};
const historyRoot=createRoot(central);
document.querySelector('#history').onclick=()=> historyRoot.render(React.createElement(PageHistoryWorkspace,{
 page:pages[0],backend,theme:{},disabled:false,open:true,onOpenChange:noop,
 onBack:noop,onBusyChange:v=>window.busy.push(v),onCompositionChange:v=>window.composing.push(v),
 onRecord:async label=>{window.calls.push(label);await new Promise((resolve,reject)=>{window.finishRecord=resolve;window.failRecord=()=>reject(new Error('Synthetic failure'));});},
 onRestore:async id=>{window.calls.push(id);},
 sectionsTarget:central
}));
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
            res.end(
              `<!doctype html><html><body><button id="sections">Sections</button><button id="history">History</button><div id="app"></div><script type="module" src="/workspace-preview-harness.js"></script></body></html>`,
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

async function eventually(check: () => Promise<boolean>) {
  await expect.poll(check, { timeout: 15_000 }).toBe(true);
}

describe('central management workspaces', () => {
  it('never labels old operation rows as named versions when the new filter is delayed or fails', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl);
      await page.locator('#history').click();
      await eventually(async () => (await page.locator('[data-hd-version]').count()) === 3);
      await page.getByRole('button', { name: 'Operation history', exact: true }).click();
      await eventually(
        async () => (await page.locator('[data-hd-version="operation"]').count()) === 1,
      );
      await page.evaluate(() => {
        (window as unknown as HarnessWindow).holdCheckpoints = true;
      });
      await page.getByRole('button', { name: 'Saved versions', exact: true }).click();
      expect(await page.locator('[data-hd-version]').count()).toBe(0);
      await page.evaluate(() => (window as unknown as HarnessWindow).failHistory());
      await eventually(async () =>
        (await page.locator('[role="alert"]').innerText()).includes('Synthetic history failure'),
      );
      expect(await page.locator('[data-hd-version]').count()).toBe(0);
      expect(await page.locator('[data-hd-restore-version]').isDisabled()).toBe(true);
    } finally {
      await page.close();
    }
  });
  it('renders the shared Project draft in the central target while its sidebar is hidden', async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(2000);
    try {
      await page.goto(baseUrl);
      await page.locator('#sections').click();
      await eventually(
        async () => (await page.locator('#central [data-hd-section-manager]').count()) === 1,
      );
      expect(await page.locator('[role="dialog"]').count()).toBe(0);
      const manager = page.locator('#central [data-hd-section-manager]');
      expect(await manager.locator('[data-hd-section-member]').count()).toBe(2);
      await manager.getByRole('textbox', { name: 'Section name', exact: true }).fill('Renamed');
      await eventually(async () => (await manager.innerText()).includes('Renamed'));
      await manager.getByRole('button', { name: 'Discard draft', exact: true }).click();
      await eventually(
        async () =>
          (await manager
            .getByRole('textbox', { name: 'Section name', exact: true })
            .inputValue()) === 'Alpha',
      );
    } finally {
      await page.close();
    }
  });
  it('renders page history inline and prevents stale previews and IME checkpoint writes', async () => {
    const page = await browser.newPage();
    page.setDefaultTimeout(2000);
    try {
      await page.goto(baseUrl);
      await page.locator('#history').click();
      await eventually(async () => (await page.locator('[data-hd-page-history]').count()) === 1);
      expect(await page.locator('[role="dialog"]').count()).toBe(0);
      const restore = page.locator('[data-hd-restore-version]');
      await eventually(async () => await restore.isEnabled());
      await page.locator('[data-hd-version="b"]').click();
      expect(await restore.isDisabled()).toBe(true);
      await page.locator('[data-hd-version="c"]').click();
      await eventually(async () => await restore.isEnabled());
      await page.evaluate(() => (window as unknown as HarnessWindow).releasePreview());
      await restore.click();
      await eventually(
        async () =>
          JSON.stringify(await page.evaluate(() => (window as unknown as HarnessWindow).calls)) ===
          '["c"]',
      );
      const name = page.getByRole('textbox', { name: 'Slide version name', exact: true });
      await name.fill('Milestone');
      await name.dispatchEvent('compositionstart');
      await name.dispatchEvent('keydown', { key: 'Enter', isComposing: true });
      expect(await page.evaluate(() => (window as unknown as HarnessWindow).calls)).toEqual(['c']);
      await name.dispatchEvent('compositionend');
      await name.press('Enter');
      await eventually(
        async () =>
          JSON.stringify(await page.evaluate(() => (window as unknown as HarnessWindow).busy)) ===
          '[true,false,true]',
      );
      await page.evaluate(() => (window as unknown as HarnessWindow).failRecord());
      await eventually(
        async () =>
          JSON.stringify(await page.evaluate(() => (window as unknown as HarnessWindow).busy)) ===
          '[true,false,true,false]',
      );
      expect(await page.evaluate(() => (window as unknown as HarnessWindow).composing)).toEqual([
        true,
        false,
      ]);
    } finally {
      await page.close();
    }
  });
});
