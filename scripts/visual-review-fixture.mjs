import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/** Only synthetic files under the task-owned verification directory are created. */
export async function createVisualReviewFixture(root, require, prefix = 'v014-') {
  const parent = path.join(root, '.verification', 'visual-review-projects');
  await fs.mkdir(parent, { recursive: true });
  const { createServer } = await import(pathToFileURL(require.resolve('vite')).href);
  const server = await createServer({
    root,
    configFile: false,
    optimizeDeps: { noDiscovery: true, entries: [] },
    server: { middlewareMode: true },
    logLevel: 'silent',
  });
  let directory;
  try {
    const { acquireWriterLock, canonicalProjectRoot } = await server.ssrLoadModule(
      '/packages/core/src/pptd/persistence.ts',
    );
    for (let attempt = 0; attempt < 32; attempt++) {
      const candidate = await fs.mkdtemp(path.join(parent, prefix));
      const project = path.join(candidate, 'synthetic-project');
      await fs.mkdir(project);
      try {
        const release = await acquireWriterLock(
          await canonicalProjectRoot(project),
          path.join(candidate, 'lock-probe'),
        );
        await release();
        directory = candidate;
        break;
      } catch (error) {
        if (
          error.code !== 'WRITER_LOCKED' ||
          !['EACCES', 'EADDRINUSE', 'EPERM'].includes(error.details?.causeCode)
        )
          throw error;
      }
    }
  } finally {
    await server.close();
  }
  if (!directory) throw new Error('No OS-available writer port for synthetic acceptance.');
  const YAML = require('yaml');
  const projectRoot = path.join(directory, 'synthetic-project');
  const profile = path.join(directory, 'profile');
  const evidence = path.join(directory, 'evidence');
  const entry = path.join(projectRoot, 'deck.pptd');
  for (const folder of ['pages', 'assets', '.huandeng'])
    await fs.mkdir(path.join(projectRoot, folder), { recursive: true });
  await fs.mkdir(profile);
  await fs.mkdir(evidence);
  const ids = Array.from({ length: 3 }, () => randomUUID());
  const pagePaths = ['pages/reference.page', 'pages/comparison.page', 'pages/next.page'];
  const titles = [
    'Evidence, clearly presented',
    'Two sources, one comparison',
    'What follows from the evidence?',
  ];
  const emptyStory = { purpose: '', audience: '', takeaway: '' };
  const sourceA =
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300"><rect width="480" height="300" fill="#f1f5f2"/><rect x="62" y="60" width="150" height="150" fill="#6e9180"/><circle cx="325" cy="135" r="70" fill="#afc5b8"/><text x="40" y="270" font-family="Arial" font-size="22" fill="#263f32">A · Synthetic source image</text></svg>';
  const sourceB =
    '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="300" viewBox="0 0 480 300"><rect width="480" height="300" fill="#f2f4f8"/><circle cx="145" cy="135" r="72" fill="#6989ad"/><rect x="270" y="62" width="148" height="148" fill="#afc0d6"/><text x="40" y="270" font-family="Arial" font-size="22" fill="#293e58">B · Synthetic source image</text></svg>';
  await fs.writeFile(path.join(projectRoot, 'assets/source-a.svg'), sourceA);
  await fs.writeFile(path.join(projectRoot, 'assets/source-b.svg'), sourceB);
  await fs.writeFile(
    entry,
    YAML.stringify({
      title: 'Visual authoring · 合成验收项目',
      size: [960, 540],
      pages: pagePaths,
      theme: { textStyles: { title: { fontFamily: 'Arial', fontSize: 30, color: '#222222' } } },
    }),
  );
  for (const [index, file] of pagePaths.entries()) {
    await fs.writeFile(
      path.join(projectRoot, file),
      YAML.stringify({
        title: titles[index],
        elements: [
          {
            elementId: 'title',
            elementType: 'text',
            bounds: [48, 24, 864, 50],
            content: { text: titles[index], fontSize: 30, fontFamily: 'Arial', color: '#222222' },
          },
          {
            elementId: 'existing-note',
            elementType: 'text',
            bounds: [48, 500, 864, 22],
            content: {
              text: 'Synthetic fixture · original content remains',
              fontSize: 13,
              color: '#637068',
            },
          },
          ...(index === 0
            ? [
                {
                  elementId: 'reference-image',
                  elementType: 'image',
                  src: 'assets/source-a.svg',
                  bounds: [150, 110, 660, 330],
                  fit: { mode: 'contain' },
                },
              ]
            : []),
        ],
        notes: 'Synthetic review notes. No private research content.',
      }),
    );
  }
  await fs.writeFile(
    path.join(projectRoot, '.huandeng/project.json'),
    JSON.stringify(
      {
        schemaVersion: 1,
        deckId: randomUUID(),
        entry: 'deck.pptd',
        project: {
          schemaVersion: 1,
          mainStory: emptyStory,
          sections: [],
          presentations: [
            {
              id: 'review-talk',
              title: 'Evidence talk · 证据比较演示',
              story: emptyStory,
              items: [
                { id: 'live-one', kind: 'page', pageId: ids[1] },
                { id: 'live-two', kind: 'page', pageId: ids[1] },
              ],
            },
          ],
        },
        slides: Object.fromEntries(
          ids.map((id, index) => [
            id,
            {
              shortCode: ['R014', 'C014', 'N014'][index],
              label: `S${index + 1}`,
              path: pagePaths[index],
              state: 'active',
              designIntent: {
                purpose: 'Compare supplied evidence',
                keep: ['Keep original figure pixels and labels'],
                requestedChange: 'Add a clear evidence layout',
              },
              elementRoles: { title: 'title' },
            },
          ]),
        ),
      },
      null,
      2,
    ),
  );
  await fs.writeFile(
    path.join(profile, 'preferences.json'),
    JSON.stringify({ recentProjects: [], locale: 'en' }),
  );
  return {
    directory,
    projectRoot,
    profile,
    evidence,
    entry,
    ids,
    pagePaths,
    sources: { sourceA, sourceB },
  };
}
