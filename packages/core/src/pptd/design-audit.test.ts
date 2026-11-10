import { describe, expect, it } from 'vitest';
import { auditSlideDesign } from './design-audit';
import { insightFixture } from './project-insights.test-utils';

function fixture() {
  const deck = insightFixture();
  deck.pages[1].data.elements = [
    {
      elementId: 'title',
      elementType: 'text',
      bounds: [48, 36, 800, 50],
      content: { text: '清晰的工作流', fontSize: 28 },
    },
    {
      elementId: 'body',
      elementType: 'text',
      bounds: [48, 120, 400, 200],
      content: { text: 'One clear point.', fontSize: 18 },
    },
    {
      elementId: 'capture',
      elementType: 'image',
      bounds: [480, 120, 400, 248],
      src: 'media/capture.png',
    },
  ];
  deck.pages[1].metadata.elementRoles = { title: 'title', body: 'body' };
  return deck;
}

describe('read-only design audit', () => {
  it('normalizes to canvas width and reports the real low-resolution case without mutation', () => {
    const deck = fixture();
    const before = JSON.stringify(deck);
    const report = auditSlideDesign(deck, {}, { 'media/capture.png': { width: 192, height: 119 } });
    expect(report.findings.find((item) => item.code === 'DESIGN_LOW_RESOLUTION')).toMatchObject({
      pageId: 'evidence',
      elementId: 'capture',
      measured: 0.24,
    });
    expect(report.findings.some((item) => item.code === 'DESIGN_LARGE_TYPE')).toBe(false);
    expect(report.visualInspectionRequired).toBe(true);
    expect(JSON.stringify(deck)).toBe(before);
    deck.size = [1920, 1080];
    for (const element of deck.pages[1].data.elements) {
      if (element.bounds)
        element.bounds = element.bounds.map((n) => n * 2) as [number, number, number, number];
      if (element.content) element.content.fontSize = Number(element.content.fontSize) * 2;
    }
    const doubled = auditSlideDesign(
      deck,
      {},
      { 'media/capture.png': { width: 192, height: 119 } },
    );
    expect(doubled.pages[1].text.map((item) => item.normalizedSize)).toEqual([28, 18]);
    expect(doubled.pages[1].images[0].sampling).toBe(0.24);
  });

  it('keeps divider requirements optional and honors explicit background exceptions', () => {
    const deck = fixture();
    deck.pages[1].data.background = { type: 'solid', color: '#f4f4f4' };
    expect(
      auditSlideDesign(deck).findings.some(
        (item) => item.code === 'DESIGN_SECTION_DIVIDER_MISSING',
      ),
    ).toBe(false);
    const report = auditSlideDesign(deck, {
      requireSectionDividers: true,
      expectedBackground: '#fff',
    });
    expect(report.findings.map((item) => item.code)).toContain('DESIGN_SECTION_DIVIDER_MISSING');
    expect(report.findings.map((item) => item.code)).toContain('DESIGN_BACKGROUND_MISMATCH');
    deck.pages[1].metadata.designIntent = { backgroundException: 'Intentional transition' };
    deck.pages[1].data.elements = [deck.pages[1].data.elements[0]];
    expect(
      auditSlideDesign(deck, { requireSectionDividers: true, expectedBackground: '#fff' }).findings,
    ).toEqual([]);
  });

  it('keeps declared figure labels out of body-size warnings and supports profile limits', () => {
    const deck = fixture();
    deck.pages[1].data.elements[0].content = { text: 'Large title', fontSize: 40 };
    deck.pages[1].data.elements[1].content = { text: 'Figure label', fontSize: 40 };
    deck.pages[1].metadata.elementRoles = { title: 'title', body: 'figure-label' };
    const report = auditSlideDesign(deck, { language: 'en' });
    expect(
      report.findings
        .filter((item) => item.code === 'DESIGN_LARGE_TYPE')
        .map((item) => item.elementId),
    ).toEqual(['title']);
    expect(auditSlideDesign(deck, { maxTitleSize: 45 }).findings).toEqual([]);
    expect(() => auditSlideDesign(deck, { maxBodySize: Number.NaN })).toThrow();
  });

  it('uses contain fit, crops and vector status rather than guessing pixels', () => {
    const deck = fixture();
    const image = deck.pages[1].data.elements[2];
    image.bounds = [100, 100, 400, 400];
    image.fit = { mode: 'contain' };
    const report = auditSlideDesign(
      deck,
      {},
      { 'media/capture.png': { width: 1600, height: 400 } },
    );
    expect(report.pages[1].images[0].sampling).toBe(2);
    image.crop = { left: 0.25, right: 0.25 };
    expect(
      auditSlideDesign(deck, {}, { 'media/capture.png': { width: 1600, height: 400 } }).pages[1]
        .images[0].sampling,
    ).toBe(1);
    expect(
      auditSlideDesign(deck, {}, { 'media/capture.png': { width: 0, height: 0, vector: true } })
        .pages[1].images[0].status,
    ).toBe('vector');
    expect(auditSlideDesign(deck).pages[1].images[0].status).toBe('unmeasured');
  });
});
