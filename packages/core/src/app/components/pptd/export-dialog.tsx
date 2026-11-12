import { Check, Download, Loader2, Video, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { type PptdBackend, PptdClientError } from '@/lib/pptd-backend';
import { visiblePages } from '../../../pptd/page-visibility';
import type { DeckSnapshot, PageSnapshot } from '../../../pptd/types';
import type { VideoCapabilities } from '../../../pptd/video-encoder';
import { createVideoPlan, type ExportJobStatus, type ExportResult } from '../../../pptd/video-plan';

const states = {
  preparing: '准备文稿与素材',
  rendering: '渲染动画',
  encoding: '完成视频编码',
  completed: '导出完成',
  failed: '导出失败',
  cancelled: '已取消',
};

export function ExportDialog({
  open,
  onOpenChange,
  backend,
  snapshot,
  page,
  blocked,
  beforeExport,
  onReport,
  onBusyChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backend: PptdBackend;
  snapshot: DeckSnapshot;
  page?: PageSnapshot;
  blocked: boolean;
  beforeExport: () => Promise<unknown>;
  onReport: (reportUrl: string) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  useHuandengLocale();
  const [format, setFormat] = useState<'pptx' | 'pdf' | 'png' | 'mp4' | 'zip'>('pptx');
  const [scope, setScope] = useState<'collection' | 'page'>('collection');
  const [includeHidden, setIncludeHidden] = useState(false);
  const archiveEntry =
    snapshot.metadata.entry ||
    snapshot.entry.replace(/\\/g, '/').split('/').at(-1) ||
    snapshot.entry;
  const hiddenCount = snapshot.pages.filter((item) => item.metadata.hidden).length;
  const [resolution, setResolution] = useState<720 | 1080>(720);
  const [fps, setFps] = useState<24 | 30>(30);
  const [staticSeconds, setStaticSeconds] = useState('3');
  const [endSeconds, setEndSeconds] = useState('1');
  const [cueSeconds, setCueSeconds] = useState('0');
  const [capability, setCapability] = useState<VideoCapabilities | null>(null);
  const [job, setJob] = useState<ExportJobStatus | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const active = !!job && !['completed', 'failed', 'cancelled'].includes(job.state);
  const working = starting || active;
  useEffect(() => {
    onBusyChange(starting);
    return () => onBusyChange(false);
  }, [starting, onBusyChange]);
  const options = useMemo(
    () => ({
      presentationId: snapshot.presentationId ?? null,
      includeHidden,
      ...(scope === 'page' && page ? { pageId: page.pageId, occurrenceId: page.occurrenceId } : {}),
      resolution,
      fps,
      staticDurationMs: Math.round(Number(staticSeconds) * 1000),
      endHoldMs: Math.round(Number(endSeconds) * 1000),
      cueHoldMs: Math.round(Number(cueSeconds) * 1000),
    }),
    [
      snapshot.presentationId,
      includeHidden,
      scope,
      page,
      resolution,
      fps,
      staticSeconds,
      endSeconds,
      cueSeconds,
    ],
  );
  const preview = useMemo(() => {
    try {
      if (![staticSeconds, endSeconds, cueSeconds].every((value) => value.trim() !== ''))
        throw new Error('请输入停留时间。');
      return { plan: createVideoPlan(snapshot, options), error: null };
    } catch (failure) {
      return { plan: null, error: failure instanceof Error ? failure.message : String(failure) };
    }
  }, [snapshot, options, staticSeconds, endSeconds, cueSeconds]);

  useEffect(() => {
    if (!open || format !== 'mp4') return;
    let disposed = false;
    void backend
      .videoCapabilities()
      .then((value) => {
        if (!disposed) setCapability(value);
      })
      .catch((failure: Error) => {
        if (!disposed) setCapability({ available: false, formats: [], message: failure.message });
      });
    return () => {
      disposed = true;
    };
  }, [open, format, backend]);

  useEffect(() => {
    if (!job?.id || !active) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const status = await backend.exportStatus(job.id);
        if (disposed) return;
        setJob(status);
        if (status.result) {
          setResult(status.result);
          onReport(status.result.reportUrl);
        }
        setError(status.state === 'failed' ? (status.error ?? '导出失败。') : null);
        if (['completed', 'failed', 'cancelled'].includes(status.state)) {
          setCancelling(false);
          return;
        }
      } catch (failure) {
        if (disposed) return;
        if (failure instanceof PptdClientError && failure.status === 404) {
          const message = '导出任务已过期。已保存的成品仍在 Exports 目录，也可以重新导出。';
          setJob((previous) =>
            previous
              ? { ...previous, state: 'failed', finishedAt: Date.now(), error: message }
              : null,
          );
          setCancelling(false);
          setError(message);
          return;
        }
        setError(failure instanceof Error ? failure.message : String(failure));
      }
      if (!disposed) timer = setTimeout(() => void poll(), 600);
    };
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, [job?.id, active, backend, onReport]);

  const start = async () => {
    setStarting(true);
    setError(null);
    setResult(null);
    setJob(null);
    setCancelling(false);
    try {
      await beforeExport();
      if (format === 'zip') setJob(await backend.startProjectArchive());
      else if (format === 'mp4') setJob(await backend.startVideo(options));
      else {
        const output =
          format === 'png' && page
            ? await backend.render(page.pageId, page.occurrenceId, snapshot.presentationId)
            : await backend.export(
                format as 'pptx' | 'pdf',
                snapshot.presentationId ?? null,
                includeHidden,
              );
        setResult(output as ExportResult);
        onReport(output.reportUrl);
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      setStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[calc(100dvh-3rem)] overflow-y-auto sm:max-w-xl"
        data-hd-export-dialog
      >
        <DialogHeader>
          <DialogTitle>{t('导出')}</DialogTitle>
          <DialogDescription>
            {t('选择交付格式和范围。导出使用开始时保存的文稿与素材。')}
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={working} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5 text-xs">
              {t('格式')}
              <select
                aria-label={t('导出格式')}
                value={format}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                onChange={(event) => setFormat(event.target.value as typeof format)}
              >
                <option value="pptx">PowerPoint · PPTX</option>
                <option value="pdf">{t('文档 · PDF')}</option>
                <option value="png">{t('当前页图片 · PNG')}</option>
                <option value="mp4">{t('动画视频 · MP4')}</option>
                <option value="zip">{t('Editable Project (ZIP)')}</option>
              </select>
            </label>
            <label className="space-y-1.5 text-xs">
              {t('范围')}
              <select
                aria-label={t('导出范围')}
                value={
                  format === 'zip'
                    ? 'project'
                    : format === 'png'
                      ? 'page'
                      : format === 'mp4'
                        ? scope
                        : 'collection'
                }
                disabled={format !== 'mp4'}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                onChange={(event) => setScope(event.target.value as typeof scope)}
              >
                {format === 'zip' && <option value="project">{t('Entire Project')}</option>}
                <option value="collection">
                  {t('{value0} · {value1}{value2}页', {
                    value0: snapshot.presentationId ? snapshot.title : t('主幻灯片'),
                    value1: includeHidden
                      ? snapshot.pages.length
                      : visiblePages(snapshot.pages).length,
                    value2: ' ',
                  })}
                </option>
                <option value="page" disabled={!page}>
                  {t('当前页{value0}', { value0: page?.shortCode ? ` · ${page.shortCode}` : '' })}
                </option>
              </select>
            </label>
          </div>
          {format === 'zip' && (
            <p
              className="text-xs leading-relaxed text-muted-foreground"
              data-hd-project-archive-scope
            >
              {t(
                'Includes all pages, original assets, Story, Presentations and named versions. Extract and open {entry}.',
                { entry: archiveEntry },
              )}{' '}
              {t(
                'Local connections, caches and earlier exports stay on this computer. The report lists excluded files.',
              )}
            </p>
          )}
          {hiddenCount > 0 &&
            format !== 'png' &&
            format !== 'zip' &&
            (format !== 'mp4' || scope === 'collection') && (
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={includeHidden}
                  onChange={(event) => setIncludeHidden(event.target.checked)}
                />
                {t('Include hidden slides ({count})', { count: hiddenCount })}
              </label>
            )}
          {format === 'mp4' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5 text-xs">
                  {t('分辨率')}
                  <select
                    aria-label={t('视频分辨率')}
                    value={resolution}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    onChange={(event) => setResolution(Number(event.target.value) as 720 | 1080)}
                  >
                    <option value={720}>720p</option>
                    <option value={1080}>1080p</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs">
                  {t('帧率')}
                  <select
                    aria-label={t('视频帧率')}
                    value={fps}
                    className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                    onChange={(event) => setFps(Number(event.target.value) as 24 | 30)}
                  >
                    <option value={24}>24 fps</option>
                    <option value={30}>30 fps</option>
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: '静态页停留（秒）',
                    value: staticSeconds,
                    set: setStaticSeconds,
                    min: 0.1,
                  },
                  { label: '动画末帧（秒）', value: endSeconds, set: setEndSeconds, min: 0 },
                  { label: '每步骤额外（秒）', value: cueSeconds, set: setCueSeconds, min: 0 },
                ].map((field) => (
                  <label className="space-y-1.5 text-xs" key={field.label}>
                    {t(field.label)}
                    <input
                      aria-label={t(field.label)}
                      type="number"
                      min={field.min}
                      max={60}
                      step={0.1}
                      value={field.value}
                      onChange={(event) => field.set(event.target.value)}
                      className="h-9 w-full rounded-md border bg-background px-2 text-sm tabular-nums"
                    />
                  </label>
                ))}
              </div>
              <div className="rounded-md bg-muted/60 px-3 py-2.5 text-xs leading-relaxed">
                {preview.plan && (
                  <p className="mb-1 font-medium" data-hd-video-estimate>
                    {t('{value0} 页 ·{value1}{value2} 秒 · {value3} ×{value4}{value5}', {
                      value0: preview.plan.segments.length,
                      value1: ' ',
                      value2: (preview.plan.durationMs / 1000).toFixed(2),
                      value3: preview.plan.width,
                      value4: ' ',
                      value5: preview.plan.height,
                    })}
                  </p>
                )}
                <p className="text-muted-foreground">
                  {t(
                    '动画按时间线播放；演示步骤按上方停留时间继续。输出无声视频，无页面转场。GIF / APNG / 动态 WebP / 自主动画 SVG 需先换成静态素材。',
                  )}
                </p>
              </div>
              {!capability ? (
                <p className="text-xs text-muted-foreground">{t('正在检查视频编码器…')}</p>
              ) : !capability.available ? (
                <p className="text-xs text-destructive" role="alert">
                  {t(capability.message)}
                </p>
              ) : null}
              {preview.error && (
                <p className="text-xs text-destructive" role="alert">
                  {t(preview.error)}
                </p>
              )}
            </>
          ) : (
            <p className="rounded-md bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
              {t('输出基础版式中的静态画面。需要播放关键帧动画，请选择“动画视频 · MP4”。')}
            </p>
          )}
        </fieldset>
        {blocked && (
          <p role="alert" className="text-xs text-amber-700">
            {t('请先保存或放弃项目、Story、图表和动画草稿，再开始导出。')}
          </p>
        )}
        {(working || job) && (
          <div className="space-y-2 text-xs" aria-live="polite" data-hd-export-progress>
            <div className="flex items-center justify-between">
              <span>
                {starting
                  ? t('准备导出…')
                  : job?.format === 'zip' && job.state === 'preparing'
                    ? t('Copying saved Project')
                    : job?.format === 'zip' && job.state === 'encoding'
                      ? t('Compressing Project ZIP')
                      : job
                        ? t(states[job.state])
                        : ''}
              </span>
              {job && (
                <span className="tabular-nums">
                  {job.format === 'zip'
                    ? t('{completed} / {total} files', {
                        completed: job.files?.completedFiles ?? 0,
                        total: job.files?.totalFiles ?? 0,
                      })
                    : t('{value0} / {value1} 帧', {
                        value0: job.completedFrames,
                        value1: job.totalFrames,
                      })}
                </span>
              )}
            </div>
            {active && (
              <progress
                className="h-1.5 w-full accent-primary"
                max={job.format === 'zip' ? job.files?.totalBytes || 1 : job.totalFrames || 1}
                value={
                  job.format === 'zip' ? (job.files?.completedBytes ?? 0) : job.completedFrames
                }
                aria-label={
                  job.format === 'zip' ? t('Project archive progress') : t('视频导出进度')
                }
              />
            )}
            {active && (
              <p className="text-muted-foreground">{t('可以关闭此窗口，稍后从“导出”查看进度。')}</p>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="break-words text-xs text-destructive">
            {t(error)}
          </p>
        )}
        {result && (
          <div
            className="space-y-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs"
            data-hd-export-result
          >
            <p className="flex items-center gap-2 font-medium">
              <Check className="size-4" />
              {result.fileName}
            </p>
            {result.file && (
              <p className="break-all text-muted-foreground">
                {t('已保存到 {value0}', { value0: result.file })}
              </p>
            )}
            <a
              className="inline-flex items-center gap-1.5 font-medium text-primary underline underline-offset-4"
              href={result.url}
              download={result.fileName}
            >
              <Download className="size-3.5" />
              {t('下载文件')}
            </a>
            <a
              className="ml-4 text-muted-foreground underline underline-offset-4"
              href={result.reportUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('导出报告')}
            </a>
          </div>
        )}
        {result?.warnings?.map((warning) => (
          <p key={warning} className="text-amber-800 dark:text-amber-300" role="status">
            {warning}
          </p>
        ))}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('关闭')}
          </Button>
          {active && job ? (
            <Button
              variant="outline"
              disabled={cancelling}
              onClick={() => {
                setCancelling(true);
                void backend.cancelExport(job.id).catch((failure: Error) => {
                  setError(failure.message);
                  setCancelling(false);
                });
              }}
            >
              <X />
              {cancelling ? t('正在取消…') : t('取消导出')}
            </Button>
          ) : (
            <Button
              disabled={
                starting ||
                blocked ||
                (format !== 'zip' && !snapshot.pages.length) ||
                (format === 'mp4' && (!capability?.available || !!preview.error)) ||
                (format === 'png' && !page)
              }
              onClick={() => void start()}
            >
              {starting ? (
                <Loader2 className="animate-spin" />
              ) : format === 'mp4' ? (
                <Video />
              ) : (
                <Download />
              )}
              {result ? t('再次导出') : t('开始导出')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
