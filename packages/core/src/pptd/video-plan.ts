import { compileTimeline } from './animation-model';
import { type DeckSnapshot, PptdError } from './types';

export interface VideoExportOptions {
  includeHidden?: boolean;
  pageId?: string;
  occurrenceId?: string;
  resolution?: 720 | 1080;
  fps?: 24 | 30;
  staticDurationMs?: number;
  endHoldMs?: number;
  cueHoldMs?: number;
}

export interface VideoSegment {
  pageIndex: number;
  pageId: string;
  occurrenceId?: string;
  versionId?: string;
  renderRevision: string;
  timelineDurationMs: number;
  cueTimesMs: number[];
  durationMs: number;
  startFrame: number;
  frameCount: number;
}

export interface VideoPlan {
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  durationMs: number;
  staticDurationMs: number;
  endHoldMs: number;
  cueHoldMs: number;
  segments: VideoSegment[];
}

export interface ExportResult {
  url: string;
  reportUrl: string;
  fileName: string;
  file: string;
  report: unknown;
  warnings?: string[];
}

export interface ExportJobStatus {
  id: string;
  format: string;
  state: 'preparing' | 'rendering' | 'encoding' | 'completed' | 'failed' | 'cancelled';
  files?: {
    completedFiles: number;
    totalFiles: number;
    completedBytes: number;
    totalBytes: number;
  };
  completedFrames: number;
  totalFrames: number;
  createdAt: number;
  finishedAt?: number;
  plan?: VideoPlan;
  result?: ExportResult;
  error?: string;
}

function milliseconds(value: number | undefined, fallback: number, min: number, max: number) {
  const result = value === undefined ? fallback : value;
  if (!Number.isInteger(result) || result < min || result > max)
    throw new PptdError('INVALID_REQUEST', `停留时间必须为 ${min}–${max} 毫秒的整数。`);
  return result;
}

export function createVideoPlan(
  snapshot: DeckSnapshot,
  options: VideoExportOptions = {},
): VideoPlan {
  const resolution = options.resolution === undefined ? 720 : options.resolution;
  const fps = options.fps === undefined ? 30 : options.fps;
  if (![720, 1080].includes(resolution) || ![24, 30].includes(fps))
    throw new PptdError('INVALID_REQUEST', '视频支持 720p / 1080p 和 24 / 30 fps。');
  const staticDurationMs = milliseconds(options.staticDurationMs, 3000, 100, 60_000);
  const endHoldMs = milliseconds(options.endHoldMs, 1000, 0, 60_000);
  const cueHoldMs = milliseconds(options.cueHoldMs, 0, 0, 60_000);
  const [sourceWidth, sourceHeight] = snapshot.size;
  if (![sourceWidth, sourceHeight].every((n) => Number.isFinite(n) && n > 0))
    throw new PptdError('INVALID_DOCUMENT', '页面尺寸无效。');
  const scale = Math.min((resolution * 16) / 9 / sourceWidth, resolution / sourceHeight);
  const width = Math.max(2, 2 * Math.floor((sourceWidth * scale) / 2));
  const height = Math.max(2, 2 * Math.floor((sourceHeight * scale) / 2));
  let totalFrames = 0;
  const segments: VideoSegment[] = [];
  const requested = options.pageId?.toLowerCase();
  const matchesPage = (page: DeckSnapshot['pages'][number]) =>
    !requested ||
    page.pageId.toLowerCase() === requested ||
    page.shortCode?.toLowerCase() === requested ||
    page.metadata.label?.toLowerCase() === requested;
  if (requested && !options.occurrenceId) {
    const matches = snapshot.pages.filter(matchesPage);
    if (matches.length > 1)
      throw new PptdError('AMBIGUOUS_ID', '该页面在演讲中出现多次，请指定 occurrenceId。', {
        occurrences: matches.map((page) => ({
          pageId: page.pageId,
          occurrenceId: page.occurrenceId,
        })),
      });
  }
  for (const [pageIndex, page] of snapshot.pages.entries()) {
    if (options.occurrenceId ? page.occurrenceId !== options.occurrenceId : !matchesPage(page))
      continue;
    if (!requested && !options.occurrenceId && !options.includeHidden && page.metadata.hidden)
      continue;
    const timeline = compileTimeline(page.data)?.timeline;
    const cueTimesMs = timeline?.cues?.map((cue) => cue.timeMs).sort((a, b) => a - b) ?? [];
    const timelineDurationMs = timeline?.durationMs ?? 0;
    const durationMs = timeline
      ? timelineDurationMs + endHoldMs + cueTimesMs.length * cueHoldMs
      : staticDurationMs;
    const frameCount = Math.max(1, Math.ceil((durationMs * fps) / 1000));
    segments.push({
      pageIndex,
      pageId: page.pageId,
      occurrenceId: page.occurrenceId,
      versionId: page.versionId,
      renderRevision: page.renderRevision,
      timelineDurationMs,
      cueTimesMs,
      durationMs,
      startFrame: totalFrames,
      frameCount,
    });
    totalFrames += frameCount;
    if (options.pageId && !options.occurrenceId) break;
  }
  if (!segments.length) throw new PptdError('TARGET_NOT_FOUND', '找不到要导出的视频页面。');
  if (totalFrames > 18000 || totalFrames / fps > 600)
    throw new PptdError('INVALID_REQUEST', '本次视频超过 10 分钟或 18000 帧，请缩小导出范围。');
  return {
    width,
    height,
    fps,
    totalFrames,
    durationMs: (totalFrames / fps) * 1000,
    staticDurationMs,
    endHoldMs,
    cueHoldMs,
    segments,
  };
}

export function videoFrameTime(plan: VideoPlan, segment: VideoSegment, frame: number): number {
  if (!Number.isInteger(frame) || frame < 0 || frame >= segment.frameCount)
    throw new PptdError('INVALID_REQUEST', '视频帧超出页面范围。');
  if (!segment.timelineDurationMs) return 0;
  if (frame === segment.frameCount - 1) return segment.timelineDurationMs;
  let time = (frame * 1000) / plan.fps;
  for (const cue of segment.cueTimesMs) {
    if (time < cue) break;
    if (time < cue + plan.cueHoldMs) return cue;
    time -= plan.cueHoldMs;
  }
  return Math.min(time, segment.timelineDurationMs);
}
