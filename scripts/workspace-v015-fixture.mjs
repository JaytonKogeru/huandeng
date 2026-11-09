import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createVisualReviewFixture } from './visual-review-fixture.mjs';

export async function createWorkspaceFixture(root, require) {
  const fixture = await createVisualReviewFixture(root, require, 'v015-');
  const YAML = require('yaml');
  const { projectRoot, entry, ids, pagePaths } = fixture;
  const metadataPath = path.join(projectRoot, '.huandeng/project.json');
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  for (let index = 3; index < 6; index++) {
    ids.push(randomUUID());
    pagePaths.push(`pages/synthetic-${index + 1}.page`);
    const title = `Synthetic heading ${index + 1} · 原文`;
    await fs.writeFile(
      path.join(projectRoot, pagePaths[index]),
      YAML.stringify({
        title,
        elements: [
          {
            elementId: 'title',
            elementType: 'text',
            bounds: [48, 24, 864, 50],
            content: { text: title, fontSize: 30 },
          },
        ],
        notes: `Synthetic notes ${index + 1} · 原文`,
      }),
    );
    metadata.slides[ids[index]] = {
      shortCode: `W00${index + 1}`,
      path: pagePaths[index],
      state: 'active',
      elementRoles: { title: 'title' },
    };
  }
  const manifest = YAML.parse(await fs.readFile(entry, 'utf8'));
  manifest.pages = pagePaths;
  manifest.title = 'Workspace acceptance · 合成项目';
  await fs.writeFile(entry, YAML.stringify(manifest));
  metadata.slides[ids[0]].hidden = true;
  metadata.slides[ids[4]].hidden = true;
  metadata.project.sections = [
    {
      id: 'alpha-section',
      title: 'Evidence group · 证据',
      startPageId: ids[1],
      pageIds: ids.slice(1, 3),
    },
    {
      id: 'beta-section',
      title: 'Results group · 结果',
      startPageId: ids[3],
      pageIds: ids.slice(3, 5),
    },
  ];
  const second = YAML.parse(await fs.readFile(path.join(projectRoot, pagePaths[1]), 'utf8'));
  for (const [index, id] of ['figure-a', 'figure-b'].entries())
    second.elements.push({
      elementId: id,
      name: `Synthetic figure ${index + 1}`,
      elementType: 'shape',
      shapeName: 'rect',
      bounds: [80 + index * 450, 160, 260, 220],
      fill: { type: 'solid', color: index ? '#779bb8' : '#66977e' },
    });
  await fs.writeFile(path.join(projectRoot, pagePaths[1]), YAML.stringify(second));
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  await fs.mkdir(path.join(projectRoot, 'docs'));
  await fs.writeFile(
    path.join(projectRoot, 'docs/readme.md'),
    '# Synthetic document\n\nAuthored 文本 remains.',
  );
  await fs.writeFile(path.join(projectRoot, 'docs/values.json'), '{"synthetic":true}');
  return fixture;
}
