// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: This desktop verification runs directly with Node, outside the Turbo task cache.
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
if (!executablePath) throw new Error('Set HUANDENG_DESKTOP_EXE to the desktop executable.');
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-desktop-'));
const deck = path.join(sandbox, 'studio');
const entry = path.join(deck, 'deck.pptd');
const evidence = path.join(root, '.verification');
await fs.cp(path.join(root, 'tests/fixtures/studio'), deck, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
const launchEnv = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: path.join(sandbox, 'profile'),
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete launchEnv.ELECTRON_RUN_AS_NODE;
const checks = [];
const screenshots = [];
const rendererErrors = [];
const processLog = [];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pathKey = (value) =>
  process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
let application;
let page;
let mcp;
let url;
let target;
let sibling;
let firstEdit;
let restoredVersionId;
let storyIntent;
const intermediateTitle = '保留留白，让证据自己说话。';
const laterTitle = '这是一次可回退的修改。';
const siblingNotes = 'B6XA 的独立修改，应在 Q9R4 恢复历史时保持原样。';

async function eventually(fn, timeout = 60000) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (error) {
      lastError = error;
    }
    await wait(200);
  }
  throw lastError ?? new Error('Timed out waiting for desktop state.');
}

async function captureEvidence(name) {
  try {
    await page.screenshot({
      path: path.join(evidence, name),
      timeout: 12000,
      animations: 'disabled',
    });
    screenshots.push(name);
  } catch (error) {
    process.stderr.write(`WARN optional screenshot ${name} failed: ${String(error)}\n`);
  }
}
async function check(name, fn) {
  const start = Date.now();
  await fn();
  checks.push({ name, passed: true, milliseconds: Date.now() - start });
  process.stdout.write(`PASS ${name}\n`);
}

async function api(endpoint) {
  const response = await fetch(`${url}/__pptd${endpoint}`);
  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  return result;
}

async function openDesktop(args = []) {
  application = await electron.launch({
    executablePath,
    args: [
      ...(process.env.HUANDENG_DESKTOP_APP ? [process.env.HUANDENG_DESKTOP_APP] : []),
      ...args,
    ],
    cwd: root,
    env: launchEnv,
    timeout: 120000,
  });
  application.process().stderr?.on('data', (bytes) => processLog.push(String(bytes)));
  page = await application.firstWindow();
  page.on('pageerror', (error) => rendererErrors.push(error.message));
  page.setDefaultTimeout(15000);
  await page.locator('[data-hd-editor-canvas]').waitFor({ timeout: 120000 });
}

async function waitForProject(expectedEntry) {
  return eventually(async () => {
    if (!(await page.locator('[data-hd-editor-canvas]').count())) return false;
    const context = await page.evaluate(() => window.huandengDesktop?.getContext());
    if (!context?.entryPath || pathKey(context.entryPath) !== pathKey(expectedEntry)) return false;
    url = context.serviceUrl;
    const snapshot = await api('/session');
    return pathKey(snapshot.entry) === pathKey(expectedEntry) ? snapshot : false;
  });
}

async function callTool(name, args = {}) {
  const result = await mcp.callTool({ name, arguments: args });
  const text = result.content?.find((item) => item.type === 'text')?.text;
  if (result.isError || !text) throw new Error(text ?? `MCP ${name} did not return text.`);
  return JSON.parse(text);
}

async function applyOperations(pageId, operations) {
  const snapshot = await api('/session');
  const current = snapshot.pages.find((item) => item.pageId === pageId);
  return callTool('huandeng_apply', {
    transaction: {
      requestId: randomUUID(),
      deckId: snapshot.deckId,
      actor: 'codex-desktop-verification',
      expected: { pages: { [pageId]: current.pageRevision } },
      operations,
    },
  });
}

async function sourceHashes() {
  const snapshot = await api('/session');
  const files = ['deck.pptd', '.huandeng/project.json', ...snapshot.pages.map((item) => item.path)];
  return Object.fromEntries(
    await Promise.all(
      files.map(async (file) => [
        file,
        createHash('sha256')
          .update(await fs.readFile(path.join(deck, file)))
          .digest('hex'),
      ]),
    ),
  );
}

function thumbnail(pageId) {
  return page.locator(`[data-hd-thumbnail=${JSON.stringify(pageId)}]`);
}

async function openHistory(pageId) {
  await page.getByRole('button', { name: '页面缩略图', exact: true }).click();
  await thumbnail(pageId).click({ button: 'right' });
  await page.getByRole('menuitem', { name: '查看历史版本', exact: true }).click();
  const dialog = page.locator(`[data-hd-page-history=${JSON.stringify(pageId)}]`);
  await dialog.waitFor();
  await dialog.getByRole('button', { name: '操作记录', exact: true }).click();
  await dialog.locator('[data-hd-version]').first().waitFor();
  return dialog;
}

try {
  await check(
    'native Electron window opens the fixture with HUANDENG branding and external-agent interfaces',
    async () => {
      await openDesktop(['--entry', entry]);
      const snapshot = await waitForProject(entry);
      assert.equal(snapshot.pages.length, 3);
      target = snapshot.pages.find((item) => item.shortCode === 'Q9R4');
      sibling = snapshot.pages.find((item) => item.shortCode === 'B6XA');
      assert.ok(target && sibling);
      const windows = await application.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows().map((window) => ({
          title: window.getTitle(),
          visible: window.isVisible(),
        })),
      );
      assert.equal(windows.length, 1);
      assert.match(windows[0].title, /HUANDENG/);
      assert.equal(windows[0].visible, true);
      assert.match(await page.title(), /HUANDENG/);
      assert.equal(await page.locator('[data-agent-ui], [data-agent-provider]').count(), 0);
      assert.equal(await page.evaluate(() => window.huandengDesktop.platform), process.platform);
    },
  );

  await check(
    'external MCP records Story before editing Q9R4 and independently edits B6XA',
    async () => {
      mcp = new Client({ name: 'huandeng-desktop-verification', version: '0.2.0' });
      await mcp.connect(
        new StdioClientTransport({
          command: process.execPath,
          args: [path.join(root, 'packages/core/huandeng.js'), '--url', url, 'mcp'],
          cwd: root,
          stderr: 'pipe',
        }),
      );
      const available = await mcp.listTools();
      assert.ok(available.tools.some((tool) => tool.name === 'huandeng_story_record'));
      const context = await callTool('huandeng_context');
      await callTool('huandeng_story_record', {
        pageId: target.pageId,
        requestId: randomUUID(),
        expectedMetadataRevision: context.metadataRevision,
        actor: 'codex-desktop-verification',
        source: '桌面验收：外部 Agent 任务',
        recordedAt: new Date().toISOString(),
        purpose: '解释证据图和有意留白之间的关系。',
        keep: target.metadata.designIntent.keep,
        requestedChange: '只修改本页标题，保留原图比例、构图与其他页面。',
      });
      await thumbnail(target.pageId).click();
      await page
        .getByText('只修改本页标题，保留原图比例、构图与其他页面。', { exact: true })
        .waitFor();
      assert.equal(await page.locator('[data-hd-story] textarea').count(), 0);
      storyIntent = (await api(`/pages/${target.pageId}`)).metadata.designIntent;
      firstEdit = await applyOperations(target.pageId, [
        {
          op: 'element.patch',
          pageId: target.pageId,
          elementId: 'title',
          set: { 'content.text': intermediateTitle },
        },
      ]);
      await applyOperations(target.pageId, [
        {
          op: 'element.patch',
          pageId: target.pageId,
          elementId: 'title',
          set: { 'content.text': laterTitle },
        },
      ]);
      await applyOperations(sibling.pageId, [
        { op: 'page.notes.set', pageId: sibling.pageId, text: siblingNotes },
      ]);
      await eventually(async () =>
        (
          await page.locator('[data-hd-editor-canvas] [data-hd-element-id="title"]').innerText()
        ).includes(laterTitle),
      );
    },
  );

  await check(
    'thumbnail history previews and restores an intermediate version without changing other files',
    async () => {
      const before = await sourceHashes();
      const dialog = await openHistory(target.pageId);
      const intermediateId = `commit:${firstEdit.operationId}`;
      await dialog.locator(`[data-hd-version=${JSON.stringify(intermediateId)}]`).click();
      await eventually(async () =>
        (await dialog.locator('[data-hd-history-preview]').innerText()).includes(intermediateTitle),
      );
      assert.equal(
        (await api(`/pages/${target.pageId}`)).data.elements.find(
          (item) => item.elementId === 'title',
        ).content.text,
        laterTitle,
      );
      await captureEvidence('desktop-v04-history.png');
      await dialog.getByRole('button', { name: '将此版本恢复为当前页', exact: true }).click();
      await eventually(
        async () =>
          (await api(`/pages/${target.pageId}`)).data.elements.find(
            (item) => item.elementId === 'title',
          ).content.text === intermediateTitle,
      );
      await dialog
        .getByText(
          `已恢复 ${target.shortCode ?? target.metadata.label} 的工作稿。需要保留本轮成果时，再记录一个命名版本。`,
          { exact: true },
        )
        .waitFor();
      const after = await sourceHashes();
      assert.deepEqual(
        Object.keys(before).filter((file) => before[file] !== after[file]),
        [target.path],
      );
      assert.equal((await api(`/pages/${sibling.pageId}`)).data.notes, siblingNotes);
      const restored = await api(`/pages/${target.pageId}`);
      assert.deepEqual(restored.metadata.designIntent, storyIntent);
      assert.equal(restored.pageId, target.pageId);
      assert.equal(restored.path, target.path);
      assert.deepEqual(await api(`/pages/${target.pageId}/versions`), []);
      const versions = await api(`/pages/${target.pageId}/versions?view=operations`);
      assert.equal(versions[0].kind, 'restore');
      assert.equal(versions[0].current, true);
      restoredVersionId = versions[0].versionId;
      await dialog.getByRole('button', { name: '返回编辑', exact: true }).click();
    },
  );

  await check('project tree displays real files and selects pages by stable identity', async () => {
    await thumbnail(target.pageId).click({ button: 'right' });
    await page.getByRole('menuitem', { name: '在项目文件中显示', exact: true }).click();
    const tree = page.locator('[data-hd-project-tree]');
    await tree.waitFor();
    const file = tree.locator(`[data-hd-project-file=${JSON.stringify(target.path)}]`);
    await file.waitFor();
    assert.equal(await file.getAttribute('aria-pressed'), 'true');
    assert.equal(await tree.locator('[data-hd-project-file="deck.pptd"]').count(), 1);
    assert.equal(await tree.locator('[data-hd-project-file=".huandeng/project.json"]').count(), 1);
    await tree.locator(`[data-hd-project-file=${JSON.stringify(sibling.path)}]`).click();
    await eventually(async () => new URL(page.url()).searchParams.get('page') === sibling.pageId);
    await file.click();
    await eventually(async () => new URL(page.url()).searchParams.get('page') === target.pageId);
    await captureEvidence('desktop-v04-editor.png');
  });

  await check('desktop restart reopens the last project and retains page history', async () => {
    await mcp.close();
    mcp = undefined;
    await application.close();
    application = undefined;
    await eventually(async () => {
      try {
        await fetch(`${url}/__pptd/session`, { signal: AbortSignal.timeout(1000) });
        return false;
      } catch {
        return true;
      }
    });
    assert.deepEqual(await fs.readdir(path.join(sandbox, 'runtime', 'sessions')), []);
    await openDesktop();
    await waitForProject(entry);
    assert.equal(
      (await api(`/pages/${target.pageId}`)).data.elements.find(
        (item) => item.elementId === 'title',
      ).content.text,
      intermediateTitle,
    );
    const dialog = await openHistory(target.pageId);
    await dialog.locator(`[data-hd-version=${JSON.stringify(restoredVersionId)}]`).waitFor();
    await dialog
      .locator(`[data-hd-version=${JSON.stringify(`commit:${firstEdit.operationId}`)}]`)
      .waitFor();
    await dialog.getByRole('button', { name: '返回编辑', exact: true }).click();
  });

  await check(
    'native New and Open dialogs create and reopen real PPTD projects through IPC',
    async () => {
      const selectedPath = path.join(sandbox, 'New HUANDENG Project.pptd');
      const newEntry = path.join(sandbox, 'New HUANDENG Project', 'deck.pptd');
      await application.evaluate(({ dialog }, filePath) => {
        dialog.showSaveDialog = async () => ({ canceled: false, filePath });
      }, selectedPath);
      await page.evaluate(() => {
        void window.huandengDesktop.newProject().catch((error) => console.error(error.message));
      });
      const created = await waitForProject(newEntry);
      assert.equal(created.pages.length, 1);
      assert.equal(created.pages[0].data.elements.length, 0);
      await fs.access(newEntry);
      await fs.access(path.join(path.dirname(newEntry), created.pages[0].path));
      await application.evaluate(({ dialog }, entryPath) => {
        dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [entryPath] });
      }, entry);
      await page.evaluate(() => {
        void window.huandengDesktop.openProject().catch((error) => console.error(error.message));
      });
      await waitForProject(entry);
      assert.equal((await api(`/pages/${sibling.pageId}`)).data.notes, siblingNotes);
      const recent = await page.evaluate(() => window.huandengDesktop.recentProjects());
      assert.ok(recent.some((item) => pathKey(item.entryPath) === pathKey(entry)));
      assert.ok(recent.some((item) => pathKey(item.entryPath) === pathKey(newEntry)));
    },
  );
  await check(
    'the home screen lists recent projects and reopens the selected document',
    async () => {
      await page.evaluate(() => {
        void window.huandengDesktop.showHome().catch((error) => console.error(error.message));
      });
      await page.locator('#recent-projects .project').first().waitFor();
      assert.equal(await page.locator('#recent-projects .project').count(), 2);
      assert.equal(await page.locator('#open-project').isEnabled(), true);
      assert.equal(await page.locator('#new-project').isEnabled(), true);
      await application.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]?.setContentSize(1280, 900),
      );
      await page.mouse.move(10, 10);
      await captureEvidence('desktop-v05-home.png');
      await page.locator(`[data-entry=${JSON.stringify(entry)}]`).click();
      await waitForProject(entry);
      assert.equal((await api(`/pages/${sibling.pageId}`)).data.notes, siblingNotes);
    },
  );
  assert.deepEqual(rendererErrors, []);
  const report = {
    passed: true,
    platform: process.platform,
    node: process.version,
    electron: await application.evaluate(() => process.versions.electron),
    timestamp: new Date().toISOString(),
    executablePath,
    entry,
    checks,
    rendererErrors,
    screenshots,
  };
  await fs.writeFile(
    path.join(evidence, 'desktop-v04.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
} catch (error) {
  const report = {
    passed: false,
    timestamp: new Date().toISOString(),
    entry,
    checks,
    error: error.stack,
    rendererErrors,
    processLog: processLog.join('').slice(-12000),
  };
  await fs.writeFile(
    path.join(evidence, 'desktop-v04.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await page?.screenshot({ path: path.join(evidence, 'desktop-v03-failure.png') }).catch(() => {});
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  await mcp?.close().catch(() => {});
  await application?.close().catch(() => {});
  await fs.writeFile(path.join(evidence, 'desktop-v04-process.log'), processLog.join(''));
}
