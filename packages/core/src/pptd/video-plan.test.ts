import { describe, expect, it } from 'vitest';
import { type BuildTimeline, compileTimeline } from './animation-model';
import { deckFixture } from './fixtures.test-utils';
import { assertVideoAsset } from './video-encoder';
import { createVideoPlan, videoFrameTime } from './video-plan';

function motion() {
  const snapshot = deckFixture([
    { elementId: 'box', elementType: 'shape', shapeName: 'rect', bounds: [20, 20, 100, 100] },
  ]);
  snapshot.pages[0].data.timeline = {
    schemaVersion: 1,
    durationMs: 2000,
    tracks: [
      {
        id: 'motion',
        targetId: 'box',
        property: 'x',
        keyframes: [
          { id: 'a', timeMs: 0, value: 20, easing: 'linear' },
          { id: 'b', timeMs: 2000, value: 400, easing: 'linear' },
        ],
      },
    ],
    cues: [{ id: 'pause', timeMs: 1000, label: 'Explain' }],
  };
  return snapshot;
}

describe('deterministic video plans', () => {
  it('skips hidden slides in a collection while retaining explicit single-page exports and original indices', () => {
    const source = motion();
    source.pages.push({
      ...structuredClone(source.pages[0]),
      pageId: 'second',
      occurrenceId: 'second-use',
    });
    source.pages[0].metadata.hidden = true;
    expect(createVideoPlan(source).segments.map((item) => item.pageIndex)).toEqual([1]);
    expect(createVideoPlan(source, { includeHidden: true }).segments).toHaveLength(2);
    expect(createVideoPlan(source, { pageId: source.pages[0].pageId }).segments[0].pageIndex).toBe(
      0,
    );
    source.pages[0].occurrenceId = 'hidden-use';
    expect(createVideoPlan(source, { occurrenceId: 'hidden-use' }).segments).toHaveLength(1);
  });
  it('uses derived build steps while keeping authored effects and exact occurrence identity', () => {
    const source = motion();
    const timeline: BuildTimeline = {
      schemaVersion: 2,
      effects: [
        {
          id: 'enter',
          targetId: 'box',
          kind: 'fade-in',
          trigger: 'click',
          durationMs: 300,
          delayMs: 0,
        },
        {
          id: 'move',
          targetId: 'box',
          kind: 'move',
          trigger: 'click',
          durationMs: 600,
          delayMs: 0,
          dx: 300,
          dy: 0,
        },
      ],
    };
    source.pages[0].occurrenceId = 'opening';
    source.pages[0].data.timeline = timeline;
    const repeated = structuredClone(source.pages[0]);
    repeated.occurrenceId = 'recap';
    repeated.versionId = 'checkpoint:earlier';
    source.pages.push(repeated);
    const before = structuredClone(source);
    const plan = createVideoPlan(source, {
      occurrenceId: 'recap',
      fps: 30,
      endHoldMs: 100,
      cueHoldMs: 300,
    });
    expect(plan.segments[0]).toMatchObject({
      occurrenceId: 'recap',
      versionId: 'checkpoint:earlier',
      timelineDurationMs: 900,
      cueTimesMs: [300, 900],
      durationMs: 1600,
    });
    expect(plan.totalFrames).toBe(48);
    const compiled = compileTimeline(repeated.data);
    expect(compiled?.sample(videoFrameTime(plan, plan.segments[0], 0)).get('box')?.opacity).toBe(0);
    expect(videoFrameTime(plan, plan.segments[0], 12)).toBe(300);
    expect(compiled?.sample(videoFrameTime(plan, plan.segments[0], 47)).get('box')?.matrix[4]).toBe(
      320,
    );
    expect(source).toEqual(before);
  });
  it('samples a timeline around cue holds and includes the exact final state', () => {
    const plan = createVideoPlan(motion(), { fps: 30, endHoldMs: 500, cueHoldMs: 1000 });
    const segment = plan.segments[0];
    expect(plan.totalFrames).toBe(105);
    expect(plan.durationMs).toBe(3500);
    expect(videoFrameTime(plan, segment, 0)).toBe(0);
    expect(videoFrameTime(plan, segment, 30)).toBe(1000);
    expect(videoFrameTime(plan, segment, 59)).toBe(1000);
    expect(videoFrameTime(plan, segment, 75)).toBe(1500);
    expect(videoFrameTime(plan, segment, 104)).toBe(2000);
  });
  it('retains repeated and pinned occurrence order and selects an exact occurrence', () => {
    const source = motion();
    source.pages[0].shortCode = 'A7F3';
    expect(createVideoPlan(source, { pageId: 'a7f3' }).segments[0].pageId).toBe(
      source.pages[0].pageId,
    );
    source.pages[0].occurrenceId = 'opening';
    const repeat = structuredClone(source.pages[0]);
    repeat.occurrenceId = 'recap';
    repeat.versionId = 'checkpoint:old';
    repeat.renderRevision = 'sha256:older';
    source.pages.push(repeat);
    const both = createVideoPlan(source);
    expect(both.segments.map((item) => item.occurrenceId)).toEqual(['opening', 'recap']);
    expect(() => createVideoPlan(source, { pageId: source.pages[0].pageId })).toThrow(/多次/);
    expect(() => createVideoPlan(source, { pageId: 'a7f3' })).toThrow(/多次/);
    const selected = createVideoPlan(source, { occurrenceId: 'recap' });
    expect(selected.segments).toHaveLength(1);
    expect(selected.segments[0]).toMatchObject({
      pageIndex: 1,
      versionId: 'checkpoint:old',
      renderRevision: 'sha256:older',
    });
    expect(() => createVideoPlan(source, { occurrenceId: 'missing' })).toThrow(/找不到/);
  });
  it('keeps static pages at the configured duration and uses even bounded pixel dimensions', () => {
    const plan = createVideoPlan(deckFixture([], [600, 900]), {
      resolution: 1080,
      fps: 24,
      staticDurationMs: 1250,
    });
    expect(plan).toMatchObject({ width: 720, height: 1080, totalFrames: 30, durationMs: 1250 });
    expect(videoFrameTime(plan, plan.segments[0], 20)).toBe(0);
  });
  it('rejects excessive work and invalid parameters before starting an encoder', () => {
    const source = motion();
    expect(() => createVideoPlan(source, { fps: 60 as 30 })).toThrow();
    expect(() => createVideoPlan(source, { staticDurationMs: Number.NaN })).toThrow();
    expect(() => createVideoPlan(source, { endHoldMs: -1 })).toThrow();
    source.pages[0].data.timeline = { schemaVersion: 1, durationMs: 600000, tracks: [] };
    expect(() => createVideoPlan(source)).toThrow(/10 分钟/);
    expect(createVideoPlan(source, { endHoldMs: 0 }).totalFrames).toBe(18000);
  });
  it('rejects self-timed assets that violate the deterministic clock', () => {
    const png = (type: string, payload: string) => {
      const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
      const chunk = Buffer.alloc(Buffer.byteLength(payload) + 12);
      chunk.writeUInt32BE(Buffer.byteLength(payload));
      chunk.write(type, 4);
      chunk.write(payload, 8);
      return Buffer.concat([signature, chunk]);
    };
    expect(() => assertVideoAsset('media/motion.png', png('acTL', '12345678'))).toThrow(/APNG/);
    expect(() => assertVideoAsset('media/static.png', png('tEXt', 'acTL'))).not.toThrow();
    expect(() => assertVideoAsset('media/a.gif', Buffer.from('GIF89a'))).toThrow(/GIF/);
    expect(() =>
      assertVideoAsset('media/a.svg', Buffer.from('<svg><animate attributeName="x" /></svg>')),
    ).toThrow(/SVG/);
    expect(() =>
      assertVideoAsset('media/a.svg', Buffer.from('<svg><style>@keyframes spin {}</style></svg>')),
    ).toThrow(/SVG/);
    expect(() =>
      assertVideoAsset('media/a.svg', Buffer.from('<svg><svg:animateMotion /></svg>')),
    ).toThrow(/SVG/);
    expect(() =>
      assertVideoAsset(
        'media/a.svg',
        Buffer.from('<svg><rect style="animation-name:spin"/></svg>'),
      ),
    ).toThrow(/SVG/);
    expect(() =>
      assertVideoAsset('media/static.svg', Buffer.from('<svg><rect width="5" height="5" /></svg>')),
    ).not.toThrow();
  });
});
