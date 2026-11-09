import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const repository = path.resolve(path.dirname(script), '..');
const executable = process.env.HUANDENG_DESKTOP_EXE;
const evidence = path.resolve(
  process.env.HUANDENG_PUBLISHER_EVIDENCE ??
    path.join(repository, '.verification', 'publisher-native'),
);

if (!process.argv.includes('--child')) {
  assert.ok(executable, 'Set HUANDENG_DESKTOP_EXE to the exact packaged Editor executable.');
  await fs.mkdir(evidence, { recursive: true });
  const appDirectory = path.join(path.dirname(executable), 'resources', 'app');
  const child = spawn(executable, [script, '--child', appDirectory], {
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      HUANDENG_RUNTIME_DIR: path.join(evidence, 'runtime'),
      HUANDENG_PUBLISHER_EVIDENCE: evidence,
    },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const output = [];
  child.stdout.on('data', (value) => output.push(String(value)));
  child.stderr.on('data', (value) => output.push(String(value)));
  const code = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', resolve);
  });
  await fs.writeFile(path.join(evidence, 'runner.log'), output.join(''));
  assert.equal(code, 0, output.join(''));
  process.stdout.write(await fs.readFile(path.join(evidence, 'result.json'), 'utf8'));
} else {
  const appDirectory = process.argv[process.argv.indexOf('--child') + 1];
  const require = createRequire(import.meta.url);
  const { runPublisher, fingerprint, validatePptx } = require(
    path.join(appDirectory, 'publisher.cjs'),
  );
  const { startService, stopService } = require(path.join(appDirectory, 'service.cjs'));
  const projects = [];
  const runDirectory = path.join(evidence, 'runs', randomUUID());
  for (const id of ['one', 'two']) {
    const directory = path.join(runDirectory, `project-${id}`);
    await fs.mkdir(path.join(directory, 'pages'), { recursive: true });
    await fs.mkdir(path.join(directory, '.huandeng'), { recursive: true });
    const ids = [randomUUID(), randomUUID(), randomUUID()];
    const pages = ['pages/intro.page', 'pages/detail.page', 'pages/hidden.page'];
    const metadata = { schemaVersion: 1, deckId: randomUUID(), entry: 'deck.pptd', slides: {} };
    for (const [index, page] of pages.entries()) {
      const title = index === 2 ? `Hidden synthetic ${id}` : `Publisher ${id} / ${index + 1}`;
      const data = {
        notes: `Synthetic speaker notes ${id} / ${index + 1}`,
        elements: [
          {
            elementId: 'title',
            elementType: 'text',
            bounds: [40, 30, 880, 60],
            content: { text: title, fontFamily: 'Arial', fontSize: 30, color: '#111111' },
          },
          {
            elementId: 'body',
            elementType: 'text',
            bounds: [40, 130, 700, 100],
            content: {
              text: 'Saved PPTD → Project PPTX → validated shared copy',
              fontFamily: 'Arial',
              fontSize: 22,
              color: '#222222',
            },
          },
          {
            elementId: 'shape',
            elementType: 'shape',
            shapeName: 'rect',
            bounds: [40, 280, 200, 120],
            fill: { type: 'solid', color: '#eeeeee' },
            border: { width: 2, color: '#222222', style: 'solid' },
          },
        ],
      };
      await fs.writeFile(path.join(directory, page), JSON.stringify(data, null, 2));
      metadata.slides[ids[index]] = {
        path: page,
        shortCode: ['ABCD', 'EFGH', 'JKLM'][index],
        state: 'active',
        ...(index === 2 ? { hidden: true } : {}),
      };
    }
    const entry = path.join(directory, 'deck.pptd');
    await fs.writeFile(
      entry,
      JSON.stringify(
        {
          title: `Synthetic publisher ${id}`,
          size: [960, 540],
          pages,
          theme: { fontFamily: 'Arial' },
        },
        null,
        2,
      ),
    );
    await fs.writeFile(
      path.join(directory, '.huandeng', 'project.json'),
      JSON.stringify(metadata, null, 2),
    );
    const service = await startService(entry);
    await stopService(service);
    projects.push({
      id,
      entry,
      destination: path.join(runDirectory, 'Share', `Example-${id}.pptx`),
    });
  }
  const configFile = path.join(evidence, 'config.json');
  await fs.writeFile(
    configFile,
    JSON.stringify({ schemaVersion: 1, quietMs: 0, projects }, null, 2),
  );
  const before = await Promise.all(projects.map((project) => fingerprint(project.entry)));
  const first = await runPublisher(configFile, { force: true });
  assert.equal(first.status, 'complete');
  const after = await Promise.all(projects.map((project) => fingerprint(project.entry)));
  assert.deepEqual(
    after.map((item) => item.digest),
    before.map((item) => item.digest),
  );
  const results = [];
  for (const project of projects) {
    const file = path.join(path.dirname(project.entry), 'Exports', 'deck.pptx');
    const local = await fs.readFile(file);
    const shared = await fs.readFile(project.destination);
    assert.deepEqual(shared, local);
    const verified = validatePptx(local, 2);
    assert.equal(verified.notes, 2);
    const report = JSON.parse(await fs.readFile(`${file}.report.json`, 'utf8'));
    assert.equal(report.pages.length, 2);
    assert.ok(!report.diagnostics.some((diagnostic) => diagnostic.severity === 'error'));
    results.push({
      id: project.id,
      ...verified,
      sourceUnchanged: true,
      nativeReportErrors: 0,
      file,
    });
  }
  const stateBefore = JSON.parse(await fs.readFile(path.join(evidence, 'state-v2.json'), 'utf8'));
  const second = await runPublisher(configFile);
  assert.equal(second.status, 'complete');
  const stateAfter = JSON.parse(await fs.readFile(path.join(evidence, 'state-v2.json'), 'utf8'));
  for (const project of projects)
    assert.equal(
      stateAfter.projects[project.id].publishedAt,
      stateBefore.projects[project.id].publishedAt,
    );
  const receipt = {
    ok: true,
    projects: results,
    hiddenExcluded: true,
    notesRetained: true,
    unchangedSourcesSkipped: true,
    publisherModuleSha256: createHash('sha256')
      .update(await fs.readFile(path.join(appDirectory, 'publisher.cjs')))
      .digest('hex'),
  };
  await fs.writeFile(path.join(evidence, 'result.json'), `${JSON.stringify(receipt, null, 2)}\n`);
}
