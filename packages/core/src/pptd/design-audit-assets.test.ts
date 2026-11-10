import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readSlideDesignAudit } from './design-audit-assets';
import { insightFixture } from './project-insights.test-utils';

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

describe('bounded Project image measurements', () => {
  it('reads actual headers and rejects linked, external and escaping sources', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-design-audit-'));
    roots.push(root);
    await fs.mkdir(path.join(root, 'media'));
    const header = Buffer.alloc(24);
    header.set([0x89, 0x50, 0x4e, 0x47]);
    header.writeUInt32BE(192, 16);
    header.writeUInt32BE(119, 20);
    await fs.writeFile(path.join(root, 'media/capture.png'), header);
    const deck = insightFixture();
    deck.pages[0].data.elements = [
      'media/capture.png',
      '../capture.png',
      'https://example.com/capture.png',
    ].map((src, index) => ({
      elementId: `image-${index}`,
      elementType: 'image',
      src,
      bounds: [0, 0, 400, 248],
    }));
    const report = await readSlideDesignAudit(root, deck);
    expect(report.assetInspection).toMatchObject({ measured: 1, truncated: false });
    expect(report.assetInspection?.omitted.map((item) => item.reason)).toEqual([
      'non-project-source',
      'non-project-source',
    ]);
    expect(report.pages[0].images[0].sampling).toBe(0.24);
    await fs.symlink(
      path.join(root, 'media'),
      path.join(root, 'linked'),
      process.platform === 'win32' ? 'junction' : 'dir',
    );
    deck.pages[0].data.elements = [
      { elementId: 'linked', elementType: 'image', src: 'linked/capture.png' },
    ];
    expect((await readSlideDesignAudit(root, deck)).assetInspection?.omitted).toEqual([
      { source: 'linked/capture.png', reason: 'linked-source' },
    ]);
  });
});
