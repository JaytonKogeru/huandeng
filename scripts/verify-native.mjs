import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { chromium } = require('playwright');
const child = spawn(
  process.execPath,
  [
    path.join(root, 'packages/core/bin.js'),
    'dev',
    '--port',
    '4872',
    '--host',
    '127.0.0.1',
    '--no-skills-check',
  ],
  {
    cwd: path.join(root, 'packages/core/e2e/fixture'),
    env: { ...process.env, HUANDENG_DECK: '', OPEN_SLIDE_DEV_SUPERVISED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
const output = [];
child.stdout.on('data', (data) => output.push(String(data)));
child.stderr.on('data', (data) => output.push(String(data)));
let browser;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch('http://127.0.0.1:4872')).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  assert.equal(ready, true);
  const executablePath = [
    process.env.HUANDENG_BROWSER,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/chromium',
  ].find((item) => item && existsSync(item));
  browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    headless: true,
    args: process.platform === 'linux' ? ['--no-sandbox'] : [],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://127.0.0.1:4872/s/alpha', { waitUntil: 'networkidle' });
  const canvas = page.locator('[data-slide-id="alpha"] [data-osd-canvas]');
  await canvas.first().waitFor();
  const dimensions = await canvas.first().evaluate((element) => ({
    width: element.style.width,
    height: element.style.height,
    text: element.textContent,
  }));
  assert.equal(dimensions.width, '1920px');
  assert.equal(dimensions.height, '1080px');
  assert.ok(dimensions.text.length > 2);
  assert.deepEqual(errors, []);
  await fs.mkdir(path.join(root, '.verification'), { recursive: true });
  await page.screenshot({ path: path.join(root, '.verification/native-tsx.png') });
  const report = { passed: true, dimensions, errors };
  await fs.writeFile(
    path.join(root, '.verification/native-tsx.json'),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report));
} catch (error) {
  console.error(error.stack, output.join(''));
  process.exitCode = 1;
} finally {
  await browser?.close();
  child.kill();
}
