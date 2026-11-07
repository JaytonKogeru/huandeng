import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { openPptdStore } from '../packages/core/.verification/v07-performance-store.mjs';

const base = path.resolve('.verification/v07-performance');
const legacyFlow = process.argv.includes('--legacy-flow');
const label = legacyFlow ? 'v07-legacy-flow' : 'v07-current-flow';
const externalIterations = 100;
const run = path.join(base, `run-${Date.now()}`);
const root = path.join(run, 'project');
const stateDir = path.join(run, 'state');
await fs.mkdir(path.join(root, 'pages'), { recursive: true });
await fs.mkdir(path.join(root, '.huandeng'));
const count = 80;
const elements = Array.from({ length: 64 }, (_, i) => ({
  elementId: `object-${i}`,
  elementType: 'text',
  bounds: [(i % 8) * 110, Math.floor(i / 8) * 55, 105, 50],
  content: {
    text: `Synthetic slide element ${i}. Stable content for a store allocation diagnostic.`,
    fontSize: 16,
  },
}));
const initial = JSON.stringify({ elements, notes: 'Original' });
const pages = Array.from({ length: count }, (_, i) => `pages/${i}.page`);
await Promise.all(pages.map((p) => fs.writeFile(path.join(root, p), initial)));
await fs.writeFile(
  path.join(root, 'deck.pptd'),
  JSON.stringify({ title: 'Synthetic performance fixture', size: [960, 540], pages }),
);
await fs.writeFile(
  path.join(root, '.huandeng/project.json'),
  JSON.stringify({
    schemaVersion: 1,
    deckId: 'v07-performance-fixture',
    entry: 'deck.pptd',
    slides: Object.fromEntries(
      pages.map((p, i) => [
        `page-${i}`,
        {
          path: p,
          shortCode: `P${String(i).padStart(3, '0')}`,
          label: `S${i + 1}`,
          state: 'active',
        },
      ]),
    ),
  }),
);

const readings = [];
const timings = [];
let phase = 'open';
let pageReads = 0;
const originalReadFile = fs.readFile.bind(fs);
fs.readFile = (...args) => {
  if (String(args[0]).endsWith('.page')) pageReads++;
  return originalReadFile(...args);
};
const sample = async (label, store) => {
  global.gc();
  await new Promise((resolve) => setImmediate(resolve));
  global.gc();
  const archive = store?.pageVersions;
  const usage = archive?.cacheUsage?.();
  const observations = Array.isArray(archive?.observations) ? archive.observations : [];
  readings.push({
    label,
    ...process.memoryUsage(),
    observationCount: usage?.observations ?? observations.length,
    ...(usage
      ? { cache: usage }
      : {
          observationSourceBytes: observations.reduce(
            (total, observation) => total + Buffer.byteLength(observation.state.source),
            0,
          ),
        }),
  });
};
await sample('before-open');
const openStart = performance.now();
let store = await openPptdStore({
  entryPath: path.join(root, 'deck.pptd'),
  stateDir,
  onTiming: (event) => timings.push({ ...event, group: phase }),
});
const openMs = performance.now() - openStart;
const snapshotBytes = Buffer.byteLength(JSON.stringify(store.getSnapshot()));
await sample('open', store);
// Match the route's checkpoint observer snapshot request; do not retain its value.
let unsubscribe = store.subscribe((event) => {
  if (legacyFlow) store.getSnapshot();
  else store.getCheckpointSnapshot(event);
});
phase = 'edit';
const editReadsBefore = pageReads;
const cycles = [];
for (let i = 0; i < 40; i++) {
  const start = performance.now();
  const page = store.readPage('page-0');
  await store.commit({
    requestId: randomUUID(),
    actor: 'synthetic-diagnostic',
    deckId: 'v07-performance-fixture',
    expected: { pages: { [page.pageId]: page.pageRevision } },
    operations: [
      { op: 'page.notes.set', pageId: page.pageId, text: i % 2 ? 'Original' : 'Changed' },
    ],
  });
  // The explicit current endpoint follows a successful commit; initial/agent/session refresh still scans disk.
  JSON.stringify(await (legacyFlow ? store.refreshExternal() : store.getCurrentSnapshot()));
  cycles.push(performance.now() - start);
  if ((i + 1) % 10 === 0) await sample(`edit-${i + 1}`, store);
}
const editPageReads = pageReads - editReadsBefore;
unsubscribe();
unsubscribe = null;
phase = 'history';
let start = performance.now();
const history = await store.pageHistory('page-0');
const pageHistoryMs = performance.now() - start;
await sample('history-list', store);
await store.close();
store = null;
await sample('closed-and-released');
phase = 'reopen';
start = performance.now();
store = await openPptdStore({
  entryPath: path.join(root, 'deck.pptd'),
  stateDir,
  onTiming: (event) => timings.push({ ...event, group: phase }),
});
const reopenMs = performance.now() - start;
await sample('reopen-40-history-records', store);
phase = 'external';
const externalMs = [];
// Agent/third-party edits are intentional archival history. Measure residency, not a leak assertion.
let oldVersionId = '';
for (let i = 0; i < externalIterations; i++) {
  const source = JSON.stringify({
    elements,
    notes: `${String(i).padStart(4, '0')}:${'x'.repeat(128 * 1024)}`,
  });
  await fs.writeFile(path.join(root, pages[0]), source);
  start = performance.now();
  await store.refreshExternalState();
  externalMs.push(performance.now() - start);
  if (i === 3) oldVersionId = (await store.pageHistory('page-0'))[0].versionId;
  if ((i + 1) % 20 === 0) await sample(`external-${i + 1}`, store);
}
const externalHistoryCount = (await store.pageHistory('page-0')).length;
let oldPreview = await store.readPageVersion('page-0', oldVersionId);
const oldPreviewCorrect = oldPreview.page.data.notes === `0003:${'x'.repeat(128 * 1024)}`;
await store.restorePageVersion({
  pageId: 'page-0',
  versionId: oldVersionId,
  requestId: randomUUID(),
  expectedPageRevision: store.readPage('page-0').pageRevision,
  expectedMetadataRevision: store.getSnapshot().metadataRevision,
});
const oldRestoreCorrect = store.readPage('page-0').data.notes === oldPreview.page.data.notes;
if (!oldPreviewCorrect || !oldRestoreCorrect) throw new Error('Old version restoration failed');
await sample('external-old-version-restored', store);
oldPreview = null;
await store.close();
store = null;
await sample('external-closed-and-released');
fs.readFile = originalReadFile;
const stats = (xs) => {
  const values = [...xs].sort((a, b) => a - b);
  return {
    count: values.length,
    min: values[0],
    median: values[Math.floor(values.length / 2)],
    max: values.at(-1),
    total: values.reduce((a, b) => a + b, 0),
  };
};
const groups = {};
for (const event of timings) {
  const key = `${event.group}:${event.phase}`;
  groups[key] ??= [];
  groups[key].push(event.durationMs);
}
const report = {
  at: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  fixture: { root, pages: count, elementsPerPage: elements.length, images: 0, snapshotBytes },
  label,
  method: `Isolated actual store source, instrumented page read counter and onTiming; explicit GC at marked samples. No HTTP server, Electron renderer, watcher, real assets, or scientific originals. Edit cycles include ${legacyFlow ? 'legacy full refresh + full checkpoint snapshot' : 'queued current state + minimal checkpoint projection'} and JSON serialization. Explicit external refresh still reads disk.`,
  openMs,
  reopenMs,
  cycles: stats(cycles),
  editPageReads,
  pageHistoryMs,
  historyEntries: history.length,
  externalIterations,
  externalHistoryCount,
  oldPreviewCorrect,
  oldRestoreCorrect,
  externalMs: { first5: stats(externalMs.slice(0, 5)), last5: stats(externalMs.slice(-5)) },
  timings: Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, stats(v)])),
  readings,
};
await fs.writeFile(
  path.join(base, `store-diagnostic-${label}.json`),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
