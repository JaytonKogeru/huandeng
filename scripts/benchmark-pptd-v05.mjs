import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: {
    'baseline-ref': { type: 'string' },
    output: { type: 'string', default: '.verification/performance-v05/backend.json' },
    rounds: { type: 'string', default: '3' },
    iterations: { type: 'string', default: '3' },
  },
});
const rounds = Number(values.rounds);
const iterations = Number(values.iterations);
assert.ok(Number.isInteger(rounds) && rounds > 0 && rounds <= 10);
assert.ok(Number.isInteger(iterations) && iterations > 0 && iterations <= 20);
const require = createRequire(path.join(root, 'packages/core/package.json'));
const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-backend-benchmark-'));
const fixtureRoot = path.join(sandbox, 'fixture');
const baselinePath = path.join(root, 'packages/core/src/pptd', `.benchmark-${randomUUID()}.ts`);
const output = path.resolve(root, values.output);
const sourceHash = createHash('sha256');
let fixtureBytes = 0;
let server;
let store;

async function writeFixture(relative, text) {
  const file = path.join(fixtureRoot, relative);
  const bytes = Buffer.from(text);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, bytes);
  sourceHash.update(relative).update('\0').update(bytes);
  fixtureBytes += bytes.length;
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    count: samples.length,
    minMs: sorted[0],
    medianMs: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)],
    maxMs: sorted.at(-1),
  };
}

try {
  const assetPaths = Array.from(
    { length: 888 },
    (_, index) => `${index < 208 ? 'media' : 'assets'}/figure-${index}.svg`,
  );
  for (const [index, relative] of assetPaths.entries())
    await writeFixture(
      relative,
      `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" fill="#eef2f0"/><text x="12" y="35">Synthetic ${index}</text><!--${'x'.repeat(512)}--></svg>`,
    );
  const pages = Array.from({ length: 80 }, (_, index) => `pages/page-${index}.page`);
  for (const [index, relative] of pages.entries()) {
    const sources = [...assetPaths.slice(index * 11, index * 11 + 11), ...assetPaths.slice(0, 4)];
    const elements = [
      {
        elementId: 'title',
        elementType: 'text',
        bounds: [30, 20, 900, 50],
        content: { text: `Synthetic evidence ${index}`, fontSize: 28 },
      },
      ...sources.map((src, i) => ({
        elementId: `figure-${i}`,
        elementType: 'image',
        bounds: [30 + (i % 5) * 180, 90 + Math.floor(i / 5) * 120, 160, 105],
        src,
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        elementId: `label-${i}`,
        elementType: 'text',
        bounds: [30 + (i % 4) * 220, 455 + Math.floor(i / 4) * 20, 210, 20],
        content: { text: `Measurement ${i}: synthetic benchmark`, fontSize: 12 },
      })),
      ...Array.from({ length: 4 }, (_, i) => ({
        elementId: `shape-${i}`,
        elementType: 'shape',
        bounds: [i * 40, 510, 24, 12],
        shape: 'rect',
      })),
    ];
    await writeFixture(
      relative,
      `# Synthetic performance fixture\n${JSON.stringify({ elements, notes: 'Synthetic data; no research content.' }, null, 2)}\n`,
    );
  }
  await writeFixture(
    'deck.pptd',
    JSON.stringify(
      {
        version: 'v2',
        title: 'HUANDENG backend benchmark',
        size: [960, 540],
        pages,
        theme: { resources: assetPaths.slice(880).map((src) => ({ src })) },
      },
      null,
      2,
    ),
  );
  await writeFixture(
    '.huandeng/project.json',
    JSON.stringify(
      {
        schemaVersion: 1,
        deckId: 'benchmark-v05',
        entry: 'deck.pptd',
        slides: Object.fromEntries(
          pages.map((page, index) => [
            `page-${index}`,
            {
              path: page,
              shortCode: `P${String(index).padStart(3, '0')}`,
              label: `S${index + 1}`,
              state: 'active',
            },
          ]),
        ),
      },
      null,
      2,
    ),
  );
  const fixtureHash = sourceHash.digest('hex');
  server = await createServer({
    root: path.join(root, 'packages/core'),
    configFile: false,
    logLevel: 'error',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
    appType: 'custom',
  });
  const variants = [];
  if (values['baseline-ref']) {
    const ref = execFileSync('git', ['rev-parse', '--verify', values['baseline-ref']], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    await fs.writeFile(
      baselinePath,
      execFileSync('git', ['show', `${ref}:packages/core/src/pptd/store.ts`], { cwd: root }),
    );
    variants.push({ name: 'baseline', ref, source: baselinePath });
  }
  variants.push({ name: 'candidate', source: path.join(root, 'packages/core/src/pptd/store.ts') });
  const report = {
    passed: false,
    timestamp: new Date().toISOString(),
    platform: process.platform,
    node: process.version,
    methodology:
      'Same generated bytes, new document service/state per round; filesystem cache is not cleared. Variant order alternates. Times exclude fixture copying and module loading. Asset payloads are small SVG files, not a simulation of the real project image byte volume.',
    fixture: {
      pages: 80,
      elementsPerPage: 32,
      mediaFiles: 208,
      assetFiles: 680,
      bytes: fixtureBytes,
      sha256: fixtureHash,
    },
    rounds,
    iterations,
    variants: {},
  };
  for (const variant of variants) {
    variant.open = (await server.ssrLoadModule(variant.source)).openPptdStore;
    report.variants[variant.name] = { ref: variant.ref ?? null, samples: [], timings: [] };
  }
  for (let round = 0; round < rounds; round++) {
    for (const variant of round % 2 === 0 ? variants : [...variants].reverse()) {
      const project = path.join(sandbox, `${round}-${variant.name}`);
      const stateDir = path.join(sandbox, `${round}-${variant.name}-state`);
      await fs.cp(fixtureRoot, project, { recursive: true });
      const result = report.variants[variant.name];
      let operation = '';
      const measure = async (name, task) => {
        operation = name;
        const started = performance.now();
        const value = await task();
        result.samples.push({ round, operation: name, durationMs: performance.now() - started });
        return value;
      };
      store = await measure('open', () =>
        variant.open({
          entryPath: path.join(project, 'deck.pptd'),
          stateDir,
          onTiming: (sample) => result.timings.push({ round, operation, ...sample }),
        }),
      );
      assert.equal(store.getSnapshot().pages.length, 80);
      const commit = (operations) => {
        const snapshot = store.getSnapshot();
        return store.commit({
          requestId: randomUUID(),
          actor: 'backend-benchmark',
          deckId: snapshot.deckId,
          expected: {
            pages: { 'page-0': snapshot.pages[0].pageRevision },
            metadata: snapshot.metadataRevision,
            manifest: snapshot.manifestRevision,
          },
          operations,
        });
      };
      for (let iteration = 0; iteration < iterations; iteration++) {
        const elementId = `benchmark-${iteration}`;
        await measure('insert', () =>
          commit([
            {
              op: 'element.add',
              pageId: 'page-0',
              element: {
                elementId,
                elementType: 'shape',
                bounds: [100, 100, 160, 80],
                shape: 'rect',
              },
            },
          ]),
        );
        await measure('delete', () =>
          commit([{ op: 'element.remove', pageId: 'page-0', elementId }]),
        );
        await measure('refresh', () => store.refreshExternal());
        await measure('snapshot', () => store.getSnapshot());
        assert.equal(store.readPage('page-0').data.elements.length, 32);
        assert.ok(!(await fs.readFile(path.join(project, pages[0]), 'utf8')).includes(elementId));
      }
      assert.deepEqual(
        await fs.readFile(path.join(project, pages[1])),
        await fs.readFile(path.join(fixtureRoot, pages[1])),
      );
      await store.close();
      store = null;
      process.stdout.write(`Measured ${variant.name} round ${round + 1}/${rounds}\n`);
    }
  }
  for (const result of Object.values(report.variants)) {
    result.summary = Object.fromEntries(
      ['open', 'insert', 'delete', 'refresh', 'snapshot'].map((operation) => [
        operation,
        summarize(
          result.samples
            .filter((sample) => sample.operation === operation)
            .map((sample) => sample.durationMs),
        ),
      ]),
    );
    result.phaseSummary = Object.fromEntries(
      [...new Set(result.timings.map((sample) => sample.phase))].map((phase) => [
        phase,
        summarize(
          result.timings
            .filter((sample) => sample.phase === phase)
            .map((sample) => sample.durationMs),
        ),
      ]),
    );
  }
  report.passed = true;
  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify({ passed: true, output, fixture: report.fixture, results: Object.fromEntries(Object.entries(report.variants).map(([name, result]) => [name, result.summary])) }, null, 2)}\n`,
  );
} finally {
  await store?.close().catch(() => {});
  await server?.close();
  await fs.rm(baselinePath, { force: true });
  await fs.rm(sandbox, { recursive: true, force: true });
}
