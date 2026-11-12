import { fileURLToPath } from 'node:url';
import { type Browser, chromium } from 'playwright';
import { createServer, type ViteDevServer } from 'vite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const coreRoot = fileURLToPath(new URL('../../../../', import.meta.url)).replace(/\\/g, '/');
const harnessId = coreRoot.concat('hyperlink-harness.js');
const harness = [
  "import React from 'react';",
  "import { createRoot } from 'react-dom/client';",
  "import { PptdPageRenderer } from '/src/app/components/pptd/renderer.tsx';",
  "const page = {pageId:'links',path:'links.page',state:'active',metadata:{},data:{elements:[",
  "{elementId:'text',elementType:'text',bounds:[20,20,500,70],content:{fontSize:18,",
  'text:\'<a href="https://example.org/text?a=1&amp;b=2">Original source</a>\'}},',
  "{elementId:'unsafe',elementType:'text',bounds:[20,100,500,70],content:{fontSize:18,",
  'text:\'<a href="javascript:alert(1)">Unsafe label</a> <a href="https://user:pass@example.org">Private label</a>\'}},',
  "{elementId:'table',elementType:'table',bounds:[20,180,500,90],columnWidths:[0.5,0.5],rows:[",
  "[{text:'<a href=\"https://example.org/table\">Table source</a>'},{text:'Contribution'}]]}",
  ']}};',
  "createRoot(document.querySelector('#app')).render(React.createElement(PptdPageRenderer,{page,size:[960,540]}));",
].join('\n');

let server: ViteDevServer;
let browser: Browser;
let baseUrl: string;

beforeAll(async () => {
  server = await createServer({
    root: coreRoot,
    configFile: false,
    optimizeDeps: { entries: [] },
    resolve: { alias: { '@': coreRoot.concat('src/app') } },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [
      {
        name: 'hyperlink-test',
        resolveId: (id) => (id === '/hyperlink-harness.js' ? harnessId : undefined),
        load: (id) => (id === harnessId ? harness : undefined),
        configureServer(vite) {
          vite.middlewares.use((req, res, next) => {
            if (req.url !== '/') return next();
            res.setHeader('Content-Type', 'text/html');
            res.end(
              '<!doctype html><html><head><style>body{margin:0}</style></head>' +
                '<body><div id="app"></div><script type="module" src="/hyperlink-harness.js"></script></body></html>',
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

describe('rendered document hyperlinks', () => {
  it('keeps safe destinations on text and table labels while edit clicks stay in the document', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl);
      await page.getByText('Original source', { exact: true }).waitFor();
      const hrefs = await page
        .locator('a')
        .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
      expect(hrefs).toEqual([
        'https://example.org/text?a=1&b=2',
        null,
        null,
        'https://example.org/table',
      ]);
      await page.getByText('Original source', { exact: true }).click();
      await page.getByText('Table source', { exact: true }).click();
      expect(page.url()).toBe(baseUrl);
    } finally {
      await page.close();
    }
  });

  it('retains real external link annotations in Chromium PDF output', async () => {
    const page = await browser.newPage();
    try {
      await page.goto(baseUrl);
      await page.getByText('Table source', { exact: true }).waitFor();
      const pdf = await page.pdf({ width: '960px', height: '540px', printBackground: true });
      const objects = pdf.toString('latin1').match(/\d+ 0 obj[\s\S]*?endobj/g) ?? [];
      const links = objects.filter((object) => /\/Subtype\s*\/Link/.test(object));
      expect(links).toHaveLength(2);
      expect(links.some((link) => link.includes('/URI (https://example.org/text?a=1&b=2)'))).toBe(
        true,
      );
      expect(links.some((link) => link.includes('/URI (https://example.org/table)'))).toBe(true);
      for (const link of links) expect(link).toMatch(/\/S\s*\/URI/);
    } finally {
      await page.close();
    }
  });
});
