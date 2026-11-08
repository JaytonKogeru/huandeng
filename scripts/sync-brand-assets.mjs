import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = 'packages/desktop/branding/huandeng-user-mark.png';
const manifestPath = 'packages/desktop/brand-assets.json';
const source = await fs.readFile(path.join(root, sourcePath));
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const outputs = [
  'packages/desktop/icon.svg',
  'packages/desktop/icon.png',
  'packages/desktop/icon.ico',
  'packages/core/src/app/favicon.svg',
  'packages/core/src/app/favicon.ico',
];

if (process.argv.includes('--check')) {
  const manifest = JSON.parse(await fs.readFile(path.join(root, manifestPath), 'utf8'));
  if (manifest.source !== sourcePath || manifest.sourceSha256 !== digest(source)) {
    throw new Error('Brand source changed. Run node scripts/sync-brand-assets.mjs.');
  }
  for (const file of outputs) {
    const bytes = await fs.readFile(path.join(root, file));
    if (manifest.files[file] !== digest(bytes)) throw new Error(`Brand asset differs: ${file}`);
  }
  process.stdout.write('HUANDENG brand assets match the supplied source mark.\n');
} else {
  const require = createRequire(path.join(root, 'packages/core/package.json'));
  const { chromium } = require('playwright');
  const executablePath = [
    process.env.HUANDENG_BROWSER,
    process.platform === 'win32'
      ? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
      : '/usr/bin/chromium',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ].find((candidate) => candidate && existsSync(candidate));
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: process.platform === 'linux' ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
  });
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const frames = [];
  try {
    const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
    await page.setContent(
      `<style>body { margin: 0; } svg { display: block; }</style><svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><image width="512" height="512" href="data:image/png;base64,${source.toString('base64')}"/></svg>`,
    );
    await page.locator('svg image').evaluate(
      (image) =>
        new Promise((resolve, reject) => {
          const probe = new Image();
          probe.onload = resolve;
          probe.onerror = reject;
          probe.src = image.getAttribute('href');
        }),
    );
    for (const size of [...sizes, 512]) {
      await page.locator('svg').evaluate((svg, dimension) => {
        svg.setAttribute('width', String(dimension));
        svg.setAttribute('height', String(dimension));
      }, size);
      frames.push(await page.locator('svg').screenshot({ omitBackground: true }));
    }
  } finally {
    await browser.close();
  }
  const iconFrames = frames.slice(0, sizes.length);
  const header = Buffer.alloc(6 + 16 * iconFrames.length);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(iconFrames.length, 4);
  let offset = header.length;
  for (const [index, frame] of iconFrames.entries()) {
    const entry = 6 + index * 16;
    header[entry] = sizes[index] === 256 ? 0 : sizes[index];
    header[entry + 1] = header[entry];
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  }
  const icon = Buffer.concat([header, ...iconFrames]);
  const compactSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><title>HUANDENG</title><image width="512" height="512" href="data:image/png;base64,${frames.at(-1).toString('base64')}"/></svg>\n`,
  );
  const assets = [compactSvg, frames.at(-1), icon, compactSvg, icon];
  const hashes = {};
  for (const [index, file] of outputs.entries()) {
    await fs.writeFile(path.join(root, file), assets[index]);
    hashes[file] = digest(assets[index]);
  }
  await fs.writeFile(
    path.join(root, manifestPath),
    `${JSON.stringify({ source: sourcePath, sourceSha256: digest(source), files: hashes }, null, 2)}\n`,
  );
  process.stdout.write('Generated desktop and editor icons from the supplied HUANDENG mark.\n');
}
