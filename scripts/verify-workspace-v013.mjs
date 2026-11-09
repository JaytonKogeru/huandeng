// biome-ignore-all lint/suspicious/noUndeclaredEnvVars: This acceptance selects an isolated candidate and profile.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyNavigation } from './verify-navigation-v013.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const YAML = require('yaml');
const executablePath = process.env.HUANDENG_DESKTOP_EXE;
assert.ok(executablePath, 'Set HUANDENG_DESKTOP_EXE to the candidate executable.');
const buildIdentity = process.env.HUANDENG_DESKTOP_APP
  ? null
  : JSON.parse(
      await fs.readFile(path.join(path.dirname(executablePath), 'huandeng-build.json'), 'utf8'),
    );
const fixtureRoot = path.join(root, '.verification', 'workspace-projects');
await fs.mkdir(fixtureRoot, { recursive: true });
async function allocateFixtureRoot() {
  const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
  const server = await createServer({
    root,
    configFile: false,
    optimizeDeps: { noDiscovery: true, entries: [] },
    server: { middlewareMode: true },
    logLevel: 'silent',
  });
  try {
    const { acquireWriterLock, canonicalProjectRoot } = await server.ssrLoadModule(
      '/packages/core/src/pptd/persistence.ts',
    );
    for (let attempt = 0; attempt < 32; attempt++) {
      const directory = await fs.mkdtemp(path.join(fixtureRoot, 'huandeng-workspace-v013-'));
      const probe = path.join(directory, 'lock-probe');
      try {
        const canonical = await canonicalProjectRoot(directory);
        for (const project of ['alpha', 'beta']) {
          const release = await acquireWriterLock(path.join(canonical, project), probe);
          await release();
        }
        await fs.rm(probe, { recursive: true, force: true });
        return directory;
      } catch (error) {
        await fs.rm(directory, { recursive: true, force: true });
        if (
          error.code !== 'WRITER_LOCKED' ||
          !['EACCES', 'EADDRINUSE', 'EPERM'].includes(error.details?.causeCode)
        )
          throw error;
      }
    }
    throw new Error('Could not allocate synthetic Projects with OS-available writer ports.');
  } finally {
    await server.close();
  }
}
const sandbox = await allocateFixtureRoot();
const profile = path.join(sandbox, 'profile');
const evidence = path.join(root, '.verification/workspace-v013', path.basename(sandbox));
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(evidence, { recursive: true });
async function fixture(name) {
  const directory = path.join(sandbox, name.toLowerCase());
  for (const folder of ['pages', '.huandeng', 'docs'])
    await fs.mkdir(path.join(directory, folder), { recursive: true });
  const deckId = randomUUID();
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  const paths = ['pages/opening.page', 'pages/second.page', 'pages/third.page'];
  const entry = path.join(directory, 'deck.pptd');
  await fs.writeFile(
    entry,
    YAML.stringify({
      title: `Workspace ${name}`,
      size: [960, 540],
      pages: paths,
      theme: { fontFamily: 'Arial' },
    }),
  );
  for (const [index, file] of paths.entries())
    await fs.writeFile(
      path.join(directory, file),
      YAML.stringify({
        title: `${name} slide ${index + 1}`,
        elements: [
          {
            elementId: 'title',
            elementType: 'text',
            bounds: [48, 40, 850, 65],
            content: { text: `${name} slide ${index + 1}`, fontSize: 32 },
          },
        ],
        notes: `${name} notes ${index + 1}`,
      }),
    );
  await fs.writeFile(
    path.join(directory, '.huandeng/project.json'),
    JSON.stringify({
      schemaVersion: 1,
      deckId,
      entry: 'deck.pptd',
      slides: Object.fromEntries(
        ids.map((id, index) => [
          id,
          {
            shortCode: `${name[0]}00${index + 1}`,
            path: paths[index],
            state: 'active',
            designIntent: { purpose: `${name} initial Story`, keep: [] },
          },
        ]),
      ),
      project: {
        schemaVersion: 1,
        mainStory: { purpose: '', audience: '', takeaway: '' },
        sections: [
          {
            id: randomUUID(),
            title: `${name} introduction`,
            frontMatter: true,
            startPageId: ids[0],
            pageIds: ids,
            story: { purpose: '', audience: '', takeaway: '' },
          },
        ],
        presentations: [],
      },
    }),
  );
  await fs.writeFile(
    path.join(directory, 'docs/readme.md'),
    `# ${name} document\n\nRead-only file preview.\n`,
  );
  await fs.writeFile(
    path.join(directory, 'docs/values.json'),
    JSON.stringify({ project: name, value: 42 }, null, 2),
  );
  return { name, directory, deckId, ids, paths, entry };
}
const a = await fixture('Alpha');
const b = await fixture('Beta');
await fs.writeFile(
  path.join(profile, 'preferences.json'),
  JSON.stringify({
    uiLocale: 'en',
    recentProjects: [a, b].map((item) => ({
      entryPath: item.entry,
      title: `Workspace ${item.name}`,
      openedAt: new Date().toISOString(),
    })),
  }),
);
const env = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: profile,
  HUANDENG_RUNTIME_DIR: path.join(sandbox, 'runtime'),
};
delete env.ELECTRON_RUN_AS_NODE;
let app;
let shell;
let home;
let alpha;
let beta;
let failure;
let processLog = '';
let normalExit;
const checks = [];
const screenshots = [];
const rendererErrors = [];
async function eventually(read, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try {
      const value = await read();
      if (value) return value;
    } catch (error) {
      last = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 80));
  }
  throw last ?? new Error('Timed out waiting for workspace state.');
}
async function check(name, action) {
  const start = Date.now();
  try {
    await action();
    checks.push({ name, passed: true, milliseconds: Date.now() - start });
    process.stdout.write(`PASS ${name}\n`);
  } catch (error) {
    checks.push({ name, passed: false, error: String(error) });
    throw error;
  }
}
async function projectPage(entry) {
  return eventually(async () => {
    for (const page of app.context().pages()) {
      if (!page.url().includes('/huandeng')) continue;
      const context = await page
        .evaluate(() => window.huandengDesktop.getContext())
        .catch(() => null);
      if (
        context?.entryPath &&
        path.resolve(context.entryPath).toLowerCase() === path.resolve(entry).toLowerCase()
      )
        return page;
    }
    return null;
  }, 120000);
}
async function state() {
  return shell.evaluate(() => window.huandengDesktop.getWorkspace());
}
async function select(item) {
  const current = await state();
  const tab = current.projects.find(
    (tab) => path.resolve(tab.entryPath).toLowerCase() === path.resolve(item.entry).toLowerCase(),
  );
  assert.ok(tab);
  await shell.locator(`[data-project-id="${tab.id}"]`).click();
  await eventually(async () => (await state()).activeId === tab.id);
}
async function api(page, route, body) {
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  const session = await fetch(`${context.serviceUrl}/__pptd/session`).then((response) =>
    response.json(),
  );
  const response = await fetch(`${context.serviceUrl}/__pptd${route}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', 'x-huandeng-token': session.sessionToken },
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  assert.ok(response.ok, JSON.stringify(result));
  return result;
}
async function screenshot(name) {
  const workspace = await state();
  const active = workspace.projects.find((item) => item.id === workspace.activeId);
  const page = active ? await projectPage(active.entryPath) : home;
  await page.screenshot({ path: path.join(evidence, name), timeout: 10000 });
  const presenting = await page.locator('[data-hd-presenter]').count();
  if (!presenting)
    await shell.screenshot({
      path: path.join(evidence, `strip-${name}`),
      clip: { x: 0, y: 0, width: 1600, height: 42 },
      timeout: 10000,
    });
  if (name === 'failure.png')
    await fs.writeFile(
      path.join(evidence, 'failure-ui.txt'),
      await page.locator('body').innerText(),
    );
  screenshots.push(name);
}

try {
  app = await electron.launch({
    executablePath,
    args: [
      ...(process.env.HUANDENG_DESKTOP_APP ? [process.env.HUANDENG_DESKTOP_APP] : []),
      '--entry',
      a.entry,
    ],
    cwd: root,
    env,
    timeout: 120000,
  });
  app.process().stdout?.on('data', (chunk) => {
    processLog += chunk.toString();
  });
  app.process().stderr?.on('data', (chunk) => {
    processLog += chunk.toString();
  });
  const observe = (page) => page.on('pageerror', (error) => rendererErrors.push(error.message));
  app.context().on('page', observe);
  for (const page of app.context().pages()) observe(page);
  shell = await eventually(() =>
    app
      .context()
      .pages()
      .find((page) => page.url().endsWith('/workspace-shell.html')),
  );
  home = await eventually(() =>
    app
      .context()
      .pages()
      .find((page) => page.url().endsWith('/welcome.html')),
  );
  alpha = await projectPage(a.entry);
  await alpha.locator('[data-hd-editor-canvas]').waitFor();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1600, 1000),
  );
  const alphaUrl = alpha.url();
  const alphaEpoch = (await api(alpha, '/session')).epoch;

  await check(
    'Home opens a second Project while the first renderer and service stay alive',
    async () => {
      await shell.locator('#workspace-home').click();
      await eventually(async () => (await state()).activeId === null);
      await home.locator('[data-entry]').filter({ hasText: 'Workspace Beta' }).click();
      beta = await projectPage(b.entry);
      await beta.locator('[data-hd-editor-canvas]').waitFor();
      assert.equal((await state()).projects.length, 2);
      assert.equal(alpha.url(), alphaUrl);
      assert.equal((await api(alpha, '/session')).epoch, alphaEpoch);
      assert.notEqual(
        (await alpha.evaluate(() => window.huandengDesktop.getContext())).serviceUrl,
        (await beta.evaluate(() => window.huandengDesktop.getContext())).serviceUrl,
      );
    },
  );

  await check(
    'Recent Projects deduplicate tabs and background IPC stays bound to its sender',
    async () => {
      await shell.locator('#workspace-home').click();
      await home.locator('[data-entry]').filter({ hasText: 'Workspace Beta' }).click();
      assert.equal((await state()).projects.length, 2);
      assert.equal(
        path
          .resolve((await alpha.evaluate(() => window.huandengDesktop.getContext())).entryPath)
          .toLowerCase(),
        path.resolve(a.entry).toLowerCase(),
      );
      assert.equal(
        path
          .resolve((await beta.evaluate(() => window.huandengDesktop.getContext())).entryPath)
          .toLowerCase(),
        path.resolve(b.entry).toLowerCase(),
      );
      const configuration = await alpha.evaluate(() =>
        window.huandengDesktop.getAgentConfiguration('chatgpt'),
      );
      assert.equal(
        path.resolve(configuration.entryPath).toLowerCase(),
        path.resolve(a.entry).toLowerCase(),
      );
      assert.ok(
        configuration.configuration.includes(a.entry) ||
          configuration.configuration.includes(a.entry.replaceAll('\\', '\\\\')),
      );
    },
  );

  await check(
    'Unsaved Story survives Project and Home switches and blocks only its own close',
    async () => {
      await select(a);
      await alpha.getByRole('tab', { name: 'Story', exact: true }).click();
      const story = alpha.locator('[data-hd-story]');
      await story.getByRole('button', { name: 'Edit intent', exact: true }).click();
      const draft = 'Keep this independent Alpha Story draft.';
      await story.getByLabel('Slide authoring intent', { exact: true }).fill(draft);
      await select(b);
      await shell.locator('#workspace-home').click();
      await select(a);
      assert.equal(
        await story.getByLabel('Slide authoring intent', { exact: true }).inputValue(),
        draft,
      );
      await shell
        .getByRole('button', { name: 'Close Project: Workspace Alpha', exact: true })
        .click();
      await eventually(async () =>
        (await shell.locator('#workspace-status').innerText()).includes('draft'),
      );
      assert.equal((await state()).projects.length, 2);
      assert.equal(
        await story.getByLabel('Slide authoring intent', { exact: true }).inputValue(),
        draft,
      );
      await story.getByRole('button', { name: 'Save changes', exact: true }).click();
      await eventually(
        async () =>
          (await api(alpha, '/session')).metadata.slides[a.ids[0]].designIntent.purpose === draft,
      );
    },
  );

  await check(
    'Central file tabs preserve the Slides document and reject editing shortcuts',
    async () => {
      const before = await fs.readFile(path.join(a.directory, a.paths[0]), 'utf8');
      await alpha.getByRole('button', { name: 'Project files', exact: true }).click();
      await alpha.locator('[data-hd-project-file="docs/readme.md"]').click();
      await alpha.locator('[data-hd-file-document="docs/readme.md"] [data-hd-file-text]').waitFor();
      assert.equal(await alpha.locator('[data-hd-slide-document]').isVisible(), false);
      await alpha.locator('[data-hd-project-file="docs/values.json"]').click();
      const preview = alpha.locator(
        '[data-hd-file-document="docs/values.json"] [data-hd-file-text]',
      );
      await preview.waitFor();
      assert.equal(await alpha.locator('[data-hd-document-tabs] [role="tab"]').count(), 3);
      const content = await preview.inputValue();
      await preview.focus();
      await alpha.keyboard.press('ControlOrMeta+a');
      await alpha.keyboard.press('Backspace');
      assert.equal(await preview.inputValue(), content);
      await screenshot('01-central-files.png');
      await alpha.locator('[data-hd-document-tab="slides"]').click();
      assert.equal(await alpha.locator('[data-hd-slide-document]').isVisible(), true);
      assert.equal(await fs.readFile(path.join(a.directory, a.paths[0]), 'utf8'), before);
      await alpha.locator('[data-hd-document-tab="docs/readme.md"]').click();
      await alpha.keyboard.press('ControlOrMeta+w');
      await eventually(
        async () => (await alpha.locator('[data-hd-document-tabs] [role="tab"]').count()) === 2,
      );
      assert.equal((await state()).projects.length, 2);
      assert.equal(await alpha.locator('[data-hd-slide-document]').isVisible(), true);
    },
  );

  await check(
    'An Agent transaction updates its background Project without writing the active Project',
    async () => {
      const beforeBeta = await fs.readFile(path.join(b.directory, b.paths[0]), 'utf8');
      await select(b);
      const activeBefore = (await state()).activeId;
      const snapshot = await api(alpha, '/session');
      const first = snapshot.pages[0];
      await api(alpha, '/transactions', {
        requestId: randomUUID(),
        deckId: snapshot.deckId,
        actor: 'synthetic-agent-alpha',
        expected: { pages: { [first.pageId]: first.pageRevision } },
        operations: [
          {
            op: 'element.patch',
            pageId: first.pageId,
            elementId: 'title',
            set: { 'content.text': 'Alpha updated by its own Agent' },
          },
        ],
      });
      assert.equal((await state()).activeId, activeBefore);
      assert.equal(await fs.readFile(path.join(b.directory, b.paths[0]), 'utf8'), beforeBeta);
      await select(a);
      await eventually(async () =>
        (
          await alpha.locator('[data-hd-editor-canvas] [data-hd-element-id="title"]').innerText()
        ).includes('Alpha updated by its own Agent'),
      );
      await alpha.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
      await screenshot('02-multiple-projects.png');
    },
  );

  await check('Activity displays explicit reports only inside their selected Project', async () => {
    const report = (project, summary) => ({
      deckId: project.deckId,
      requestId: randomUUID(),
      taskId: 'synthetic-task',
      sessionId: `conversation-${project.name}`,
      actor: `Agent ${project.name}`,
      status: 'running',
      summary,
    });
    await api(beta, '/activity', report(b, 'Beta task stays in its own Project.'));
    await alpha.locator('[data-hd-open-activity]').click();
    const alphaActivity = alpha.locator('[data-testid="project-activity"]');
    await alphaActivity.waitFor();
    await api(alpha, '/activity', report(a, 'Alpha task is inspecting the current figure.'));
    await eventually(async () =>
      (await alphaActivity.innerText()).includes('Alpha task is inspecting'),
    );
    assert.ok((await alphaActivity.innerText()).includes('Client report'));
    assert.ok(!(await alphaActivity.innerText()).includes('Beta task stays'));
    await screenshot('04-alpha-activity.png');
    await select(b);
    await beta.locator('[data-hd-open-activity]').click();
    const betaActivity = beta.locator('[data-testid="project-activity"]');
    await eventually(async () => (await betaActivity.innerText()).includes('Beta task stays'));
    assert.ok(!(await betaActivity.innerText()).includes('Alpha task is inspecting'));
    await betaActivity.getByRole('button', { name: 'Close Activity', exact: true }).click();
    await select(a);
    await alphaActivity.getByRole('button', { name: 'Close Activity', exact: true }).click();
  });

  await verifyNavigation({
    app,
    page: alpha,
    api: (route, body) => api(alpha, route, body),
    check,
    capture: screenshot,
  });

  await check(
    'Present enters native fullscreen, hides the Project strip and restores the workspace',
    async () => {
      await alpha.locator('[data-hd-editor-canvas]').focus();
      await alpha.keyboard.press('F5');
      await eventually(() =>
        app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen()),
      );
      const bounds = await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].contentView.children.map((view) => view.getBounds()),
      );
      assert.ok(bounds.some((bound) => bound.y === 0 && bound.height > 500));
      await screenshot('03-fullscreen.png');
      await alpha.keyboard.press('Escape');
      await alpha.locator('[data-hd-presenter]').waitFor({ state: 'hidden' });
      await eventually(
        async () =>
          !(await app.evaluate(({ BrowserWindow }) =>
            BrowserWindow.getAllWindows()[0].isFullScreen(),
          )),
      );
      await select(b);
      await select(a);
    },
  );

  await check(
    'Closing a background Project destroys only its own renderer and keeps the active Project',
    async () => {
      const before = (await api(alpha, '/session')).epoch;
      const activeBefore = (await state()).activeId;
      await shell
        .getByRole('button', { name: 'Close Project: Workspace Beta', exact: true })
        .click();
      await eventually(async () => (await state()).projects.length === 1);
      assert.equal((await state()).activeId, activeBefore);
      assert.equal((await api(alpha, '/session')).epoch, before);
      assert.equal(beta.isClosed(), true);
    },
  );

  await check('Normal native close flushes the remaining Project and exits cleanly', async () => {
    const exited = new Promise((resolve) =>
      app.process().once('exit', (code, signal) => resolve({ code, signal })),
    );
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
    let timeout;
    try {
      normalExit = await Promise.race([
        exited,
        new Promise((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Normal close timed out.')), 30000);
        }),
      ]);
    } finally {
      clearTimeout(timeout);
    }
    assert.equal(normalExit.code, 0);
    assert.deepEqual(rendererErrors, []);
  });
} catch (error) {
  failure = error;
  process.stderr.write(`${error.stack ?? String(error)}\n`);
  if (app && !normalExit) await screenshot('failure.png').catch(() => {});
} finally {
  if (app && !normalExit)
    await app.evaluate(({ app: candidate }) => candidate.exit(1)).catch(() => {});
  await fs.writeFile(
    path.join(evidence, 'result.json'),
    `${JSON.stringify({ passed: !failure, executablePath, ...(buildIdentity ? { buildIdentity } : {}), checks, screenshots, rendererErrors, normalExit, error: failure ? String(failure) : undefined }, null, 2)}\n`,
  );
  await fs.writeFile(path.join(evidence, 'process.log'), processLog);
  process.stdout.write(`Workspace evidence: ${evidence}\n`);
  if (failure) process.exitCode = 1;
}
