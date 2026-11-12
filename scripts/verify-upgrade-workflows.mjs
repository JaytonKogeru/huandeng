import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { _electron: electron } = require('playwright');
const execute = promisify(execFile);
const executable = path.resolve(process.argv[2] ?? '');
const build = JSON.parse(
  await fs.readFile(path.join(path.dirname(executable), 'huandeng-build.json'), 'utf8'),
);
const cliFile = path.join(
  path.dirname(executable),
  'resources/app/node_modules/@open-slide/core/huandeng.js',
);
const evidence = path.join(root, '.verification', `upgrade-workflows-${randomUUID()}`);
const profile = path.join(evidence, 'profile');
const projects = path.join(evidence, '中文 Projects');
await fs.mkdir(profile, { recursive: true });
await fs.mkdir(projects, { recursive: true });
await fs.writeFile(
  path.join(profile, 'preferences.json'),
  JSON.stringify({ uiLocale: 'en', recentProjects: [] }),
);
const environment = {
  ...process.env,
  HUANDENG_DESKTOP_DATA_DIR: profile,
  HUANDENG_RUNTIME_DIR: path.join(evidence, 'runtime'),
};
delete environment.ELECTRON_RUN_AS_NODE;
delete environment.HUANDENG_URL;
delete environment.HUANDENG_DEV_SERVER;
const checks = [];
const errors = [];
let application;
let home;
let shell;
let editor;
let entry;
const report = {
  passed: false,
  productVersion: build.productVersion,
  sourceRevision: build.sourceRevision,
  checks,
  errors,
};
async function until(read, message, timeout = 45000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try {
      const result = await read();
      if (result) return result;
    } catch (error) {
      last = error;
    }
    await delay(100);
  }
  throw last ?? new Error(message);
}
async function view(suffix) {
  return until(
    () =>
      application
        .context()
        .pages()
        .find((page) => page.url().endsWith(suffix)),
    `Missing window ${suffix}`,
  );
}
async function projectView(target) {
  return until(async () => {
    for (const page of application.context().pages()) {
      if (!page.url().includes('/huandeng')) continue;
      const context = await page
        .evaluate(() => window.huandengDesktop.getContext())
        .catch(() => null);
      if (context?.entryPath === target) return page;
    }
  }, `Missing project ${target}`);
}
async function cli(...args) {
  const { stdout } = await execute(executable, [cliFile, '--entry', entry, ...args], {
    cwd: evidence,
    env: { ...environment, ELECTRON_RUN_AS_NODE: '1' },
    timeout: 60000,
    windowsHide: true,
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(stdout);
}
async function requestFile(operations) {
  const snapshot = await cli('inspect');
  const request = {
    requestId: randomUUID(),
    actor: 'upgrade-acceptance-agent',
    deckId: snapshot.deckId,
    expected: {
      pages: Object.fromEntries(snapshot.pages.map((page) => [page.pageId, page.pageRevision])),
      manifest: snapshot.manifestRevision,
      metadata: snapshot.metadataRevision,
    },
    operations,
  };
  const file = path.join(evidence, `${request.requestId}.json`);
  await fs.writeFile(file, JSON.stringify(request));
  return file;
}
async function apply(operations) {
  const file = await requestFile(operations);
  const preview = await cli('preview', file);
  return cli('apply', file, '--preview-hash', preview.previewHash);
}
async function screenshot(name, page = editor) {
  await page.screenshot({ path: path.join(evidence, `${name}.png`), timeout: 15000 });
}
async function check(name, action) {
  await action();
  checks.push(name);
  process.stdout.write(`PASS ${name}\n`);
}
async function start() {
  application = await electron.launch({
    executablePath: executable,
    args: [],
    cwd: evidence,
    env: environment,
    timeout: 45000,
  });
  application.context().setDefaultTimeout(15000);
  application
    .context()
    .on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));
  shell = await view('/workspace-shell.html');
  home = await view('/welcome.html');
  await application.evaluate(({ app, BrowserWindow }, directory) => {
    app.setPath('documents', directory);
    BrowserWindow.getAllWindows()[0].setContentSize(1520, 960);
  }, projects);
  await shell.locator('#workspace-home').click();
}
async function newProject(name, template, cancel = false) {
  await shell.locator('#workspace-home').click();
  await home.locator('#new-project').click();
  const dialog = await view('/new-project.html');
  await dialog.locator('#project-name').fill(name);
  if (template) await dialog.locator(`input[name="template"][value="${template}"]`).check();
  const expected = path.join(projects, name, 'deck.pptd');
  await until(
    async () => (await dialog.locator('#destination').innerText()) === expected,
    'The final project location is not shown.',
  );
  await screenshot(cancel ? 'new-project-cancel' : `new-project-${template}`, dialog);
  await dialog.locator(cancel ? '#cancel' : '#create').click();
  await until(() => dialog.isClosed(), 'New project dialog did not close.');
  if (cancel) {
    assert.equal(
      await fs.stat(path.dirname(expected)).then(
        () => true,
        () => false,
      ),
      false,
    );
    return;
  }
  const page = await projectView(expected);
  await page.locator('[data-hd-editor-canvas]').waitFor({ state: 'visible' });
  return { entry: expected, page };
}
async function activate(page) {
  const context = await page.evaluate(() => window.huandengDesktop.getContext());
  const workspace = await shell.evaluate(() => window.huandengDesktop.getWorkspace());
  const project = workspace.projects.find((item) => item.entryPath === context.entryPath);
  await shell.locator(`[data-project-id="${project.id}"]`).click();
}
async function conflict(local, remote, remoteTitle) {
  if (!(await editor.locator('[data-hd-notes-editor]').isVisible()))
    await editor.getByRole('button', { name: 'Notes', exact: true }).click();
  let release;
  let caught;
  const incoming = new Promise((resolve) => {
    caught = resolve;
  });
  const held = new Promise((resolve) => {
    release = resolve;
  });
  let first = true;
  const handler = async (route) => {
    if (first) {
      first = false;
      caught();
      await held;
    }
    await route.continue();
  };
  await editor.route('**/__pptd/transactions', handler);
  try {
    await editor.locator('[data-hd-notes-editor]').fill(local);
    await Promise.race([
      incoming,
      delay(15000).then(() => {
        throw new Error('The local draft did not reach the shared writer.');
      }),
    ]);
    const snapshot = await cli('inspect');
    const slide = snapshot.pages[0];
    await apply([
      { op: 'page.notes.set', pageId: slide.pageId, text: remote },
      ...(remoteTitle
        ? [
            {
              op: 'element.patch',
              pageId: slide.pageId,
              elementId: slide.data.elements.find((element) => element.elementType === 'text')
                .elementId,
              set: { 'content.text': remoteTitle },
            },
          ]
        : []),
    ]);
    release();
    await editor.getByRole('button', { name: 'Review differences', exact: true }).click();
    await editor.locator('[data-hd-conflict-review]').waitFor();
  } finally {
    release();
    await editor.unroute('**/__pptd/transactions', handler);
  }
}
try {
  await start();
  await check(
    'Home theme is visible, broadcasts to the application and survives new project creation.',
    async () => {
      await home.locator('#ui-theme').selectOption('dark');
      await until(
        async () => (await home.locator('html').getAttribute('data-theme-mode')) === 'dark',
        'Home did not switch theme.',
      );
      await screenshot('home-dark', home);
    },
  );
  await check(
    'Cancel creates no directory and the modal shows the real Unicode project entry.',
    () => newProject('取消 Test', 'guide', true),
  );
  await check(
    'The practice template creates three editable native slides and original SVG media.',
    async () => {
      const project = await newProject('练习 Project', 'guide');
      entry = project.entry;
      editor = project.page;
      const snapshot = await cli('inspect');
      assert.equal(snapshot.pages.length, 3);
      assert.ok(snapshot.pages.every((page) => page.data.elements.length > 0));
      assert.equal(await editor.evaluate(() => window.huandengDesktop.getTheme()), 'dark');
      await screenshot('practice-editor');
    },
  );
  let blank;
  await check(
    'Blank projects stay blank and window layout is shared between two open projects.',
    async () => {
      await activate(editor);
      await editor.getByRole('button', { name: 'Notes', exact: true }).click();
      await editor.getByRole('button', { name: 'Dock Notes on right', exact: true }).click();
      await until(
        async () =>
          JSON.parse(await fs.readFile(path.join(profile, 'preferences.json'), 'utf8')).windowLayout
            ?.notesDock === 'right',
        'Layout was not persisted.',
      );
      blank = await newProject('空白 Project', 'blank');
      const previous = entry;
      entry = blank.entry;
      const snapshot = await cli('inspect');
      entry = previous;
      assert.equal(snapshot.pages.length, 1);
      assert.equal(snapshot.pages[0].data.elements.length, 0);
      await blank.page.locator('[data-hd-notes-dock="right"]').waitFor({ state: 'visible' });
      await blank.page.getByRole('button', { name: 'Dock Notes below', exact: true }).click();
      await activate(editor);
      await editor.locator('[data-hd-notes-dock="bottom"]').waitFor({ state: 'visible' });
    },
  );
  await check(
    'A real overlapping external write pauses saving, shows both versions and preserves unrelated remote fields.',
    async () => {
      await conflict(
        'Local note kept after review',
        'External note for comparison',
        'Externally updated title',
      );
      const dialog = editor.locator('[data-hd-conflict-review]');
      assert.equal(
        await dialog.getByRole('button', { name: 'Keep my changes', exact: true }).isEnabled(),
        false,
      );
      assert.equal(await dialog.locator('[data-hd-conflict-side]').count(), 2);
      await screenshot('conflict-review');
      await dialog.getByRole('checkbox').check();
      await dialog.getByRole('button', { name: 'Keep my changes', exact: true }).click();
      await until(
        async () => (await cli('inspect')).pages[0].data.notes === 'Local note kept after review',
        'Conflict resolution was not saved.',
      );
      const snapshot = await cli('inspect');
      assert.ok(
        snapshot.pages[0].data.elements.some(
          (element) => element.content?.text === 'Externally updated title',
        ),
      );
    },
  );
  await check('Using the saved version retains a recoverable local draft.', async () => {
    await conflict('Recover this local note', 'Second external note');
    await editor
      .locator('[data-hd-conflict-review]')
      .getByRole('button', { name: 'Use saved version', exact: true })
      .click();
    await editor.locator('[data-hd-recover-draft]').waitFor();
    assert.equal((await cli('inspect')).pages[0].data.notes, 'Second external note');
    await editor.getByRole('button', { name: 'Recover draft', exact: true }).click();
    assert.equal(
      await editor.locator('[data-hd-notes-editor]').inputValue(),
      'Recover this local note',
    );
    await editor.getByRole('button', { name: 'Review differences', exact: true }).click();
    const recoveredReview = editor.locator('[data-hd-conflict-review]');
    await recoveredReview.getByRole('checkbox').check();
    await recoveredReview.getByRole('button', { name: 'Keep my changes', exact: true }).click();
    await until(
      async () => (await cli('inspect')).pages[0].data.notes === 'Recover this local note',
      'Recovered draft was not saved.',
    );
  });
  await check(
    'An Agent proposal is reviewed as actual slides and an independent page subset requires a new preview.',
    async () => {
      const snapshot = await cli('inspect');
      const file = await requestFile(
        snapshot.pages.slice(0, 2).map((page, index) => ({
          op: 'page.notes.set',
          pageId: page.pageId,
          text: `Proposed note ${index + 1}`,
        })),
      );
      const submitted = await cli('propose', file, '--title', 'Two slide review');
      assert.equal((await cli('inspect')).pages[0].data.notes, 'Recover this local note');
      const agentDetail = await cli('proposals', submitted.proposal.id);
      assert.equal(agentDetail.approvalNonce, undefined);
      await editor.locator('[data-hd-open-activity]').click();
      await editor.locator('[data-hd-review-proposals]').click();
      const dialog = editor.locator('[data-hd-proposal-inbox]');
      await dialog.getByText('Review only selected slides', { exact: true }).click();
      await dialog.getByRole('checkbox').first().check();
      await dialog.getByRole('button', { name: 'Create selected preview', exact: true }).click();
      await until(
        async () => (await dialog.locator('strong').last().innerText()).includes('(1/2)'),
        'Selected preview was not created.',
      );
      await screenshot('proposal-review');
      await dialog.getByRole('button', { name: 'Accept proposal', exact: true }).click();
      await until(
        async () => (await cli('inspect')).pages[0].data.notes === 'Proposed note 1',
        'Reviewed subset was not saved.',
      );
      const after = await cli('inspect');
      assert.equal(after.pages[1].data.notes, snapshot.pages[1].data.notes);
      const proposals = await cli('proposals');
      assert.ok(proposals.some((item) => item.status === 'accepted'));
      assert.ok(
        proposals.some(
          (item) => item.id === submitted.proposal.id && item.status === 'needs-rebase',
        ),
      );
    },
  );
  await check(
    'Theme, shared layout, saved edits and both projects survive a clean application restart.',
    async () => {
      await application.close();
      application = undefined;
      await start();
      assert.equal(await home.locator('#ui-theme').inputValue(), 'dark');
      editor = await projectView(entry);
      await activate(editor);
      await editor.locator('[data-hd-notes-dock="bottom"]').waitFor({ state: 'visible' });
      assert.equal((await cli('inspect')).pages[0].data.notes, 'Proposed note 1');
      await projectView(blank.entry);
      await screenshot('restarted-editor');
    },
  );
  await check(
    'The native shell refuses to navigate the trusted Editor to a private resource document.',
    async () => {
      const previousUrl = editor.url();
      await editor.evaluate(() => {
        window.location.assign('/__pptd/session');
      });
      await delay(150);
      assert.equal(editor.url(), previousUrl);
      assert.equal(await editor.locator('[data-hd-editor-canvas]').isVisible(), true);
    },
  );
  assert.deepEqual(errors, []);
  report.passed = true;
} catch (error) {
  report.failure = error?.stack ?? String(error);
  if (editor && !editor.isClosed()) {
    await screenshot('failure').catch(() => {});
    await fs.writeFile(
      path.join(evidence, 'failure-ui.txt'),
      await editor
        .locator('body')
        .innerText()
        .catch(() => ''),
    );
  }
  process.exitCode = 1;
} finally {
  if (application) {
    if (report.failure) application.process().kill();
    await Promise.race([application.close().catch(() => {}), delay(5000)]);
  }
  await fs.writeFile(path.join(evidence, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify({
      passed: report.passed,
      checks: checks.length,
      evidence,
      failure: report.failure,
    })}\n`,
  );
}
