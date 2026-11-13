import { describe, expect, it } from 'vitest';
import { assessAuthoringGate } from './authoring-gate';
import { auditSlideDesign } from './design-audit';
import { auditEditorialPatterns } from './editorial-audit';
import generatedEditorialGuide from './editorial-guide.generated.json';
import editorialStandard from './editorial-standard.json';
import { insightFixture } from './project-insights.test-utils';
import type { PageSnapshot } from './types';

function threeCardPages(): PageSnapshot[] {
  const original = insightFixture().pages[1];
  return [0, 1, 2].map((index) => ({
    ...structuredClone(original),
    pageId: 'card-' + index,
    metadata: { ...original.metadata, designIntent: { pageRole: 'content' } },
    data: {
      ...original.data,
      elements: [
        {
          elementId: 'a',
          elementType: 'shape',
          shapeName: 'roundRect',
          bounds: [45, 150, 260, 200],
        },
        {
          elementId: 'b',
          elementType: 'shape',
          shapeName: 'roundRect',
          bounds: [350, 150, 260, 200],
        },
        {
          elementId: 'c',
          elementType: 'shape',
          shapeName: 'roundRect',
          bounds: [655, 150, 260, 200],
        },
        {
          elementId: 'title',
          elementType: 'text',
          bounds: [45, 30, 860, 60],
          content: { text: 'Summary' },
        },
      ],
    },
  }));
}

describe('canonical editorial pattern checks', () => {
  it('requires an opened visual Editor for all Slides authoring stages', () => {
    expect(editorialStandard.rules.find((rule) => rule.id === 'EDITOR-20')).toMatchObject({
      level: 'hard',
      domain: 'process',
    });
    expect(generatedEditorialGuide.version).toBe(editorialStandard.version);
    expect(generatedEditorialGuide.text).toContain('EDITOR-20');
    for (const stage of ['audit', 'implement', 'validate']) {
      const requirements =
        editorialStandard.stages.find((item) => item.id === stage)?.requires ?? [];
      expect(requirements.some((item) => item.includes('Editor'))).toBe(true);
    }
  });
  it('detects repeated three-card template across real page identities without changing a deck', () => {
    const deck = insightFixture();
    deck.pages = threeCardPages();
    const before = JSON.stringify(deck);
    const report = auditSlideDesign(deck);
    expect(report.editorialStandard.version).toBe('2026-11-13-v2');
    expect(report.editorialStandard.automatedSignals).toBe(3);
    expect(report.findings.filter((f) => f.code === 'EDITORIAL_REPEATED_EQUAL_CARDS')).toHaveLength(
      3,
    );
    expect(JSON.stringify(deck)).toBe(before);
  });

  it('reports pointless footer disclaimers, repeated bullets/arrow chains and empty slogans', () => {
    const deck = insightFixture();
    const page = structuredClone(deck.pages[1]);
    page.data.elements = [
      {
        elementId: 'sub',
        elementType: 'text',
        bounds: [20, 465, 800, 35],
        role: 'footer',
        content: { text: '仅供参考；不代表最终结论。' },
      },
      {
        elementId: 'arrow',
        elementType: 'text',
        bounds: [40, 100, 700, 60],
        content: { text: 'A → B → C' },
      },
      {
        elementId: 'dots',
        elementType: 'text',
        bounds: [40, 180, 700, 60],
        content: { text: '技术 · 赋能 · 未来' },
      },
    ];
    const codes = auditEditorialPatterns([page], [960, 540]).map((f) => f.code);
    expect(codes).toContain('EDITORIAL_DISCLAIMER_FURNITURE');
    expect(codes).toContain('EDITORIAL_TEXT_ARROW_CHAIN');
    expect(codes).toContain('EDITORIAL_MIDDOT_CHAIN');
  });

  it('does not forbid necessary science caveats, individual 3-panel comparisons, or narrative titles', () => {
    const pages = threeCardPages().slice(0, 1);
    pages[0].data.elements.push({
      elementId: 'disclaimer',
      elementType: 'text',
      bounds: [50, 130, 780, 35],
      content: { text: 'This is an alternative hypothesis, not a measured experimental result.' },
    });
    expect(auditEditorialPatterns(pages, [960, 540])).toEqual([]);
  });
});

describe('explicit prototype and release editorial gate', () => {
  it('fails closed for fewer than two prototype pages, missing deck or truncated audit', () => {
    const report = auditSlideDesign(insightFixture());
    const reviewed = report.pages.slice(0, 1).map((page) => ({
      pageId: page.pageId,
      renderRevision: page.renderRevision,
      inspected: true,
      observation: 'Inspected the complete image and checked the evidence and label geometry.',
    }));
    const onePage = { ...report, pages: report.pages.slice(0, 1) };
    expect(assessAuthoringGate(onePage, { stage: 'prototype', reviews: reviewed }).status).toBe(
      'blocked',
    );
    expect(assessAuthoringGate({ ...report, pages: [] }, { stage: 'release' }).status).toBe(
      'blocked',
    );
    const full = report.pages.map((page) => ({
      pageId: page.pageId,
      renderRevision: page.renderRevision,
      inspected: true,
      observation: 'Inspected the complete image and checked the evidence and label geometry.',
    }));
    expect(
      assessAuthoringGate({ ...report, truncated: true }, { stage: 'release', reviews: full })
        .status,
    ).toBe('blocked');
  });
  it('requires actual current page revision and self-reported visual observations', () => {
    const deck = insightFixture();
    const report = auditSlideDesign(deck);
    const empty = assessAuthoringGate(report, { stage: 'release' });
    expect(empty.status).toBe('needs-review');
    expect(empty.authorAcceptance).toBe(false);
    const reviews = report.pages.map((page) => ({
      pageId: page.pageId,
      renderRevision: page.renderRevision,
      inspected: true,
      observation:
        'Compared rendered content with scientific evidence and looked for repeated UI ornaments.',
    }));
    expect(assessAuthoringGate(report, { stage: 'release', reviews }).status).toBe(
      'ready-for-author',
    );
    expect(
      assessAuthoringGate(report, {
        stage: 'release',
        reviews: reviews.map((r) => ({ ...r, renderRevision: 'stale' })),
      }).status,
    ).toBe('needs-review');
  });

  it('requires a representative prototype and resolves specific template warnings with documented exceptions', () => {
    const deck = insightFixture();
    deck.pages = threeCardPages();
    const report = auditSlideDesign(deck);
    const reviews = report.pages.map((page) => ({
      pageId: page.pageId,
      renderRevision: page.renderRevision,
      inspected: true,
      observation:
        'Inspected a 1920px full-page image and compared card proportions to reference images.',
    }));
    const blocked = assessAuthoringGate(report, {
      stage: 'prototype',
      reviews: reviews.slice(0, 2),
    });
    expect(blocked.status).toBe('blocked');
    expect(blocked.unresolvedWarnings).toHaveLength(3);
    const exceptions = report.pages.map((page) => ({
      pageId: page.pageId,
      code: 'EDITORIAL_REPEATED_EQUAL_CARDS',
      reason:
        'Each of these pages compares the same three experimental conditions on a matched basis.',
    }));
    const admitted = assessAuthoringGate(report, {
      stage: 'prototype',
      reviews: reviews.slice(0, 2),
      exceptions,
    });
    expect(admitted.status).toBe('ready-for-author');
    expect(admitted.authorAcceptance).toBe(false);
    expect(admitted.selfReportedVisualReview).toBe(true);
  });
});
