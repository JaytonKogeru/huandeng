import { describe, expect, it } from 'vitest';
import { presentationSnapshot } from './presentation-snapshot';
import { projectInsights, readStoryBriefing, storyBriefing } from './project-insights';
import { insightFixture } from './project-insights.test-utils';
import type { PageVersionSnapshot } from './types';

describe('project relationships and occurrence identity', () => {
  it('keeps stable page IDs while distinguishing repeated positions and section references', () => {
    const snapshot = insightFixture();
    const before = structuredClone(snapshot);
    const result = projectInsights(snapshot);
    expect(result.usageByPage.agenda[0]).toMatchObject({
      label: 'S18A',
      shortCode: 'S18A',
      legacyLabel: 'S1',
    });
    expect(
      result.usageByPage.agenda.map((usage) => [
        usage.presentationId,
        usage.position,
        usage.occurrenceId,
      ]),
    ).toEqual([
      [null, 1, 'main:agenda'],
      ['talk', 1, 'talk:opening:agenda'],
      ['talk', 4, 'talk:return:agenda'],
    ]);
    expect(result.usageByPage.evidence.map((usage) => usage.presentationId)).toEqual([
      null,
      'talk',
      'seminar',
    ]);
    expect(result.presentations[0]).toMatchObject({
      pageCount: 4,
      uniquePageCount: 3,
      pinnedPageCount: 0,
    });
    expect(snapshot).toEqual(before);
  });

  it('reports unavailable pages and missing sections without losing recoverable usages', () => {
    const snapshot = insightFixture();
    snapshot.pages = snapshot.pages.filter((page) => page.pageId !== 'evidence');
    snapshot.metadata.slides.evidence.state = 'tombstone';
    snapshot.metadata.project?.presentations[0].items.push({
      id: 'missing',
      kind: 'section',
      sectionId: 'gone',
    });
    const result = projectInsights(snapshot);
    expect(result.usageByPage.evidence).toHaveLength(2);
    expect(result.usageByPage.evidence.every((usage) => !usage.available)).toBe(true);
    expect(result.presentations[0].diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'PRESENTATION_PAGE_UNAVAILABLE',
      'PRESENTATION_SECTION_UNAVAILABLE',
    ]);
  });

  it('opens legacy projects as a single Main library without materializing metadata', () => {
    const snapshot = insightFixture();
    delete snapshot.metadata.project;
    expect(projectInsights(snapshot)).toMatchObject({
      mainPageCount: 3,
      sectionCount: 0,
      presentations: [],
    });
    expect(storyBriefing(snapshot).organization).toEqual({ sections: [], presentations: [] });
    expect(snapshot.metadata.project).toBeUndefined();
  });
});

describe('agent Story briefing', () => {
  it('exposes a first-Slide Section and its current appended members to Agent context', () => {
    const snapshot = insightFixture();
    const section = snapshot.metadata.project?.sections[0];
    if (!section) throw new Error('Missing fixture Section');
    section.startPageId = 'evidence';
    const appended = structuredClone(snapshot.pages[2]);
    appended.pageId = 'appendix';
    appended.path = 'pages/appendix.page';
    appended.shortCode = 'APP1';
    appended.metadata = { ...appended.metadata, shortCode: 'APP1', path: appended.path };
    snapshot.pages.push(appended);
    snapshot.metadata.slides[appended.pageId] = appended.metadata;
    const result = storyBriefing(snapshot, { pageId: 'appendix', presentationId: 'seminar' });
    expect(result.section?.id).toBe('results');
    expect(result.organization.sections[0]).toMatchObject({
      startPageId: 'evidence',
      pageIds: ['evidence', 'conclusion', 'appendix'],
    });
    expect(result.occurrence?.position).toBe(3);
    expect(result.usedBy.map((usage) => usage.presentationId)).toEqual([null, 'talk', 'seminar']);
    expect(section.pageIds).toEqual(['evidence', 'conclusion']);
  });

  it('uses current Section range membership for an inserted slide and Agent context', () => {
    const snapshot = insightFixture();
    const section = snapshot.metadata.project?.sections[0];
    if (!section) throw new Error('Missing fixture Section');
    section.range = { startPageId: 'evidence', endPageId: 'conclusion' };
    const inserted = structuredClone(snapshot.pages[1]);
    inserted.pageId = 'new-evidence';
    inserted.shortCode = 'NEW1';
    inserted.path = 'pages/new-evidence.page';
    inserted.metadata = {
      ...inserted.metadata,
      shortCode: 'NEW1',
      label: 'New evidence',
      path: inserted.path,
    };
    snapshot.pages.splice(2, 0, inserted);
    snapshot.metadata.slides[inserted.pageId] = inserted.metadata;
    const result = storyBriefing(snapshot, { pageId: inserted.pageId, presentationId: 'talk' });
    expect(result.section?.id).toBe('results');
    expect(result.organization.sections[0].pageIds).toEqual([
      'evidence',
      'new-evidence',
      'conclusion',
    ]);
    expect(result.occurrence?.position).toBe(3);
    expect(result.usedBy.map((usage) => usage.presentationId)).toEqual([null, 'talk', 'seminar']);
    expect(section.pageIds).toEqual(['evidence', 'conclusion']);
  });

  it('requires an exact occurrence for repeated pages and returns the actionable candidates', () => {
    try {
      storyBriefing(insightFixture(), { pageId: 'S18A', presentationId: 'talk' });
      throw new Error('Expected an ambiguous occurrence');
    } catch (error) {
      expect(error).toMatchObject({
        code: 'AMBIGUOUS_ID',
        details: {
          occurrences: [
            expect.objectContaining({ occurrenceId: 'talk:opening:agenda', position: 1 }),
            expect.objectContaining({ occurrenceId: 'talk:return:agenda', position: 4 }),
          ],
        },
      });
    }
  });

  it('combines scoped stories, occurrence notes, neighbors and current write revisions', () => {
    const snapshot = insightFixture();
    const result = storyBriefing(snapshot, {
      pageId: 's18a',
      presentationId: 'talk',
      occurrenceId: 'talk:return:agenda',
    });
    expect(result.main.story.purpose).toBe('Complete account');
    expect(result.presentation?.story.audience).toBe('Peers');
    expect(result.page).toMatchObject({
      pageId: 'agenda',
      source: 'current-main',
      writable: true,
      notes: 'Return to our starting question',
    });
    expect(result.neighbors.previous?.pageId).toBe('conclusion');
    expect(result.neighbors.next).toBeNull();
    expect(result.revisions.currentMainPage).toBe('sha256:agenda');
    expect(result.usedBy).toHaveLength(3);
    const evidence = storyBriefing(snapshot, { pageId: 'evidence', presentationId: 'talk' });
    expect(evidence.section?.story.takeaway).toBe('Main finding');
    expect(() =>
      storyBriefing(snapshot, {
        pageId: 'evidence',
        presentationId: 'talk',
        occurrenceId: 'talk:return:agenda',
      }),
    ).toThrow('does not belong');
    expect(() => storyBriefing(snapshot, { pageId: 'agenda', presentationId: 'seminar' })).toThrow(
      'not part',
    );
    result.page?.story.keep?.push('Only the copy changes');
    expect(snapshot.pages[0].metadata.designIntent?.keep).toEqual(['Preserve original figures']);
  });

  it('uses archived page intent for a pinned occurrence and refuses a stale or mismatched view', async () => {
    const snapshot = insightFixture();
    const versionId = `checkpoint:${'1'.repeat(32)}`;
    const item = snapshot.metadata.project?.presentations[0].items[2];
    if (item?.kind !== 'page') throw new Error('Missing fixture reference');
    item.versionId = versionId;
    const archived = structuredClone(snapshot.pages[0]);
    archived.metadata.designIntent = { purpose: 'Earlier narrative', keep: ['Archived figure'] };
    archived.pageRevision = 'sha256:old-page';
    archived.assetRevisions = { 'media/.huandeng-versions/figure.png': 'sha256:old-asset' };
    const version: PageVersionSnapshot = {
      version: {
        versionId,
        pageId: 'agenda',
        createdAt: '2026-11-07T10:00:00Z',
        actor: 'test',
        summary: 'Milestone',
        pageRevision: archived.pageRevision,
        current: false,
        kind: 'checkpoint',
      },
      page: archived,
      size: snapshot.size,
      assets: 'archived',
    };
    const options = {
      pageId: 'agenda',
      presentationId: 'talk',
      occurrenceId: 'talk:return:agenda',
    };
    expect(() => storyBriefing(snapshot, options)).toThrow('pinned occurrence');
    const view = await presentationSnapshot(snapshot, 'talk', async () => version);
    const result = storyBriefing(snapshot, options, view);
    expect(result.page).toMatchObject({
      source: 'pinned-version',
      versionId,
      writable: false,
      pageRevision: 'sha256:old-page',
      story: { purpose: 'Earlier narrative' },
    });
    expect(result.revisions.currentMainPage).toBe('sha256:agenda');
    expect(result.main.story.purpose).toBe('Complete account');
    snapshot.metadata.project?.presentations[0].items.push({
      id: 'broken',
      kind: 'page',
      pageId: 'missing-page',
    });
    snapshot.metadata.project?.presentations[0].items.push({
      id: 'another-pin',
      kind: 'page',
      pageId: 'conclusion',
      versionId: `checkpoint:${'2'.repeat(32)}`,
    });
    const reads: string[] = [];
    const scoped = await readStoryBriefing(snapshot, options, async (pageId) => {
      reads.push(pageId);
      if (pageId !== 'agenda') throw new Error('Unrelated archive is unavailable');
      return version;
    });
    expect(reads).toEqual(['agenda']);
    expect(scoped.page?.story.purpose).toBe('Earlier narrative');
    expect(scoped.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'PRESENTATION_PAGE_UNAVAILABLE', pageId: 'missing-page' }),
    );
    const live = await readStoryBriefing(
      snapshot,
      { pageId: 'evidence', presentationId: 'talk' },
      async () => {
        throw new Error('Live Story must not load archives');
      },
    );
    expect(live.page?.source).toBe('current-main');
    view.metadataRevision = 'sha256:stale';
    expect(() => storyBriefing(snapshot, options, view)).toThrow('pinned occurrence');
  });

  it('caps large sequence output explicitly while retaining exact neighbors', () => {
    const snapshot = insightFixture();
    const presentation = snapshot.metadata.project?.presentations[0];
    if (!presentation) throw new Error('Missing fixture presentation');
    presentation.items = Array.from({ length: 510 }, (_, index) => ({
      id: `use${index}`,
      kind: 'page' as const,
      pageId: 'agenda',
    }));
    const result = storyBriefing(snapshot, {
      presentationId: 'talk',
      occurrenceId: 'talk:use505:agenda',
    });
    expect(result.sequence).toMatchObject({ total: 510, truncated: true });
    expect(result.sequence.entries).toHaveLength(500);
    expect(result.occurrence?.position).toBe(506);
    expect(result.neighbors.previous?.occurrenceId).toBe('talk:use504:agenda');
  });
});
