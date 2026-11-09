import { ClipboardList, LoaderCircle, ScanText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { requestedPageFonts, technicalDiagnostics } from '../../../pptd/technical-diagnostics';
import type { Diagnostic, PageSize, PageSnapshot } from '../../../pptd/types';
import { inspectRenderedPage, type RenderCheck } from '../../lib/pptd-render-check';
import { Button } from '../ui/button';

export interface TechnicalQaPanelProps {
  page: PageSnapshot;
  size: PageSize;
  diagnostics: Diagnostic[];
  onSelect: (elementId: string) => void;
}

export function TechnicalQaPanel({ page, size, diagnostics, onSelect }: TechnicalQaPanelProps) {
  useHuandengLocale();
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checked, setChecked] = useState<{ page: PageSnapshot; result: RenderCheck } | null>(null);
  const measured = checked?.page === page ? checked.result : null;
  const issues = useMemo(() => {
    const local = technicalDiagnostics(page, size);
    const supplied = diagnostics.filter(
      (item) =>
        (!item.pageId || item.pageId === page.pageId) &&
        !(
          item.code === 'ASSET_UNAVAILABLE' &&
          local.some(
            (candidate) =>
              candidate.code === 'QA_ASSET_UNAVAILABLE' && candidate.path === item.path,
          )
        ),
    );
    const unique = new Map(
      [...local, ...supplied, ...(measured?.issues ?? [])].map((item) => [
        `${item.code}:${item.elementId ?? ''}:${item.path ?? item.message}`,
        item,
      ]),
    );
    const rank = { error: 0, warning: 1, info: 2 };
    return [...unique.values()].sort((a, b) => rank[a.severity] - rank[b.severity]);
  }, [page, size, diagnostics, measured]);
  const fonts = useMemo(() => requestedPageFonts(page), [page]);
  const errors = issues.filter((item) => item.severity === 'error').length;
  const warnings = issues.filter((item) => item.severity === 'warning').length;
  const checkRendered = async () => {
    const canvas = document.querySelector<HTMLElement>('[data-hd-editor-canvas] [data-pptd-page]');
    if (!canvas || canvas.dataset.pptdPage !== page.pageId) {
      setCheckError('请先打开要检查的页面。');
      return;
    }
    if (canvas.dataset.hdAnimationTimeMs !== undefined) {
      setCheckError('请先回到基础版式，再检查文字排版。');
      return;
    }
    setChecking(true);
    setCheckError(null);
    try {
      const result = await inspectRenderedPage(canvas, page.pageId, page.renderRevision);
      setChecked({ page, result });
    } catch (error) {
      setCheckError(error instanceof Error ? error.message : '检查未完成，请重试。');
    } finally {
      setChecking(false);
    }
  };

  return (
    <section
      className="space-y-3 border-t border-border px-4 py-4"
      aria-label={t('技术检查')}
      data-hd-technical-qa
    >
      <div className="flex items-center gap-2">
        <ClipboardList className="size-3.5" />
        <h3 className="flex-1 text-xs font-semibold">{t('技术检查')}</h3>
        <span className="text-[10px] text-muted-foreground">
          {t('{value0} 错误 · {value1} 提醒', { value0: errors, value1: warnings })}
        </span>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t('Checks inspect slide bounds, missing assets, fonts and text layout.')}
      </p>
      <div
        className="space-y-1 rounded border border-border p-2 text-[11px] text-muted-foreground"
        data-hd-author-review-state={page.authorReview?.status ?? 'unverified'}
      >
        <h4 className="font-medium text-foreground">{t('Author review evidence')}</h4>
        <p>
          {t(
            page.authorReview?.status === 'current'
              ? 'Recorded version matches'
              : page.authorReview?.status === 'stale'
                ? 'Recorded version is stale'
                : 'No verifiable recorded version',
          )}
        </p>
        <p>{t('Version match only. This does not verify author approval or visual quality.')}</p>
        <p>
          {t(
            'Occurrence order, notes and pinned versions are outside this evidence. Inspect each presentation separately.',
          )}
        </p>
        {page.authorReview?.recordedRenderRevision && (
          <details>
            <summary className="cursor-pointer">{t('Review version details')}</summary>
            <dl className="mt-1 space-y-1 break-all">
              <dt>{t('Recorded render version')}</dt>
              <dd>{page.authorReview.recordedRenderRevision}</dd>
              <dt>{t('Compared render version')}</dt>
              <dd>{page.authorReview.currentRenderRevision}</dd>
            </dl>
          </details>
        )}
      </div>
      {issues.length ? (
        <details open={errors > 0}>
          <summary className="cursor-pointer text-xs">
            {t('查看 {value0} 项检查结果', { value0: issues.length })}
          </summary>
          <ul className="mt-2 space-y-2">
            {issues.map((issue) => (
              <li
                key={`${issue.code}:${issue.elementId ?? ''}:${issue.path ?? issue.message}`}
                className="space-y-1.5 rounded border border-border p-2 text-[11px]"
                data-hd-qa-code={issue.code}
              >
                <div className="flex items-start gap-1.5">
                  <span
                    className={
                      issue.severity === 'error'
                        ? 'shrink-0 font-medium text-destructive'
                        : 'shrink-0 text-muted-foreground'
                    }
                  >
                    {issue.severity === 'error'
                      ? t('错误')
                      : issue.severity === 'warning'
                        ? t('提醒')
                        : t('信息')}
                  </span>
                  <p className="min-w-0 break-words leading-relaxed">{t(issue.message)}</p>
                </div>
                {issue.elementId &&
                  page.data.elements.some((element) => element.elementId === issue.elementId) && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        aria-label={t('定位对象 {value0}', { value0: issue.elementId })}
                        onClick={() => onSelect(issue.elementId as string)}
                      >
                        {t('定位对象')}
                      </Button>
                      <span
                        className="min-w-0 truncate font-mono text-[10px] text-muted-foreground"
                        title={issue.elementId}
                      >
                        {issue.elementId}
                      </span>
                    </div>
                  )}
                {issue.path && (
                  <p className="break-all font-mono text-[10px] text-muted-foreground">
                    {issue.path}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t('未发现外框、裁切或已知本地资源问题。')}
        </p>
      )}
      <div className="space-y-1 border-t border-border pt-2 text-[10px] leading-relaxed text-muted-foreground">
        <Button
          size="xs"
          variant="outline"
          disabled={checking}
          onClick={() => void checkRendered()}
        >
          {checking ? (
            <LoaderCircle className="size-3 animate-spin" />
          ) : (
            <ScanText className="size-3" />
          )}
          {checking ? t('正在检查…') : t('检查本页字体与排版')}
        </Button>
        {checkError && (
          <p role="alert" className="text-destructive">
            {t(checkError)}
          </p>
        )}
        {measured ? (
          <>
            <p>
              {t('已测量 {value0} 处文字与公式{value1}。', {
                value0: measured.inspectedTextBlocks,
                value1: measured.skippedTextBlocks
                  ? t('，{value0} 处暂未测量', { value0: measured.skippedTextBlocks })
                  : '',
              })}
            </p>
            {!measured.fontsReady && <p>{t('字体仍在加载，排版测量已跳过，请稍后重试。')}</p>}
            <p>
              {measured.fontAccess === 'granted'
                ? t('已核对本机字体与已加载的网页字体。')
                : measured.fontAccess === 'denied'
                  ? t('未获得本机字体权限；本机字体标为未验证。')
                  : t('此环境不支持本机字体枚举；本机字体标为未验证。')}
            </p>
            {measured.fonts.length > 0 && (
              <details>
                <summary className="cursor-pointer">
                  {t('查看 {value0} 组实际字体设置', { value0: measured.fonts.length })}
                </summary>
                <ul className="mt-2 space-y-1.5">
                  {measured.fonts.map((font) => (
                    <li key={font.requested} className="break-words">
                      <span
                        className={
                          font.status === 'fallback' ? 'text-amber-700 dark:text-amber-400' : ''
                        }
                      >
                        {font.status === 'available'
                          ? t('可用')
                          : font.status === 'fallback'
                            ? t('发生回退')
                            : font.status === 'generic'
                              ? t('系统通用字体')
                              : t('未验证')}
                      </span>{' '}
                      · {font.requested}
                      {font.status === 'fallback' && (
                        <span> → {font.resolved ?? t('浏览器默认')}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <p>
              {t('检查依据为当前画布的排版范围与字体设置；逐字形覆盖和最终观感请结合画布确认。')}
            </p>
          </>
        ) : (
          <>
            <p>
              {checked ? t('页面内容已改变，请重新检查。') : t('本机字体与文字实际排版尚未检查。')}
            </p>
            {fonts.length > 0 && <p>{t('页内声明：{value0}。', { value0: fonts.join('、') })}</p>}
            <p>{t('点击后检查继承字体、富文本、表格与公式；检查结果不会改变版式。')}</p>
          </>
        )}
      </div>
    </section>
  );
}
