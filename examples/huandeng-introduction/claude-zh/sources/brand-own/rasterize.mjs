// Rasterize official SVG marks downloaded by Claude Code (claude-zh, 2026-11-11) to transparent PNGs.
// node rasterize.mjs <in.svg> <out.png> <sizePx> [fillColor]
import { chromium } from 'file:///D:/_Proj/Huandeng/node_modules/.pnpm/playwright@1.63.0/node_modules/playwright/index.mjs';
import fs from 'node:fs';

const [input, output, size = '512', fill] = process.argv.slice(2);
let svg = fs.readFileSync(input, 'utf8');
if (fill) svg = svg.replace('<svg ', `<svg fill="${fill}" `);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(size), height: Number(size) } });
await page.setContent(
  `<html><body style="margin:0;background:transparent"><div style="width:${size}px;height:${size}px;display:flex">${svg.replace(
    '<svg ',
    `<svg style="width:${size}px;height:${size}px" `,
  )}</div></body></html>`,
);
await page.screenshot({ path: output, omitBackground: true });
await browser.close();
