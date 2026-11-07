import { ClipboardList, LoaderCircle, ScanText } from 'lucide-react';
import { useMemo, useState } from 'react';
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
      aria-label="技术检查"
      data-hd-technical-qa
    >
      <div className="flex items-center gap-2">
        <ClipboardList className="size-3.5" />
        <h3 className="flex-1 text-xs font-semibold">技术检查</h3>
        <span className="text-[10px] text-muted-foreground">
          {errors} 错误 · {warnings} 提醒
        </span>
      </div>
      {issues.length ? (
        <details open={errors > 0}>
          <summary className="cursor-pointer text-xs">查看 {issues.length} 项检查结果</summary>
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
                      ? '错误'
                      : issue.severity === 'warning'
                        ? '提醒'
                        : '信息'}
                  </span>
                  <p className="min-w-0 break-words leading-relaxed">{issue.message}</p>
                </div>
                {issue.elementId &&
                  page.data.elements.some((element) => element.elementId === issue.elementId) && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        aria-label={`定位对象 ${issue.elementId}`}
                        onClick={() => onSelect(issue.elementId as string)}
                      >
                        定位对象
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
          未发现外框、裁切或已知本地资源问题。
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
          {checking ? '正在检查…' : '检查本页字体与排版'}
        </Button>
        {checkError && (
          <p role="alert" className="text-destructive">
            {checkError}
          </p>
        )}
        {measured ? (
          <>
            <p>
              已测量 {measured.inspectedTextBlocks} 处文字与公式
              {measured.skippedTextBlocks ? `，${measured.skippedTextBlocks} 处暂未测量` : ''}。
            </p>
            {!measured.fontsReady && <p>字体仍在加载，排版测量已跳过，请稍后重试。</p>}
            <p>
              {measured.fontAccess === 'granted'
                ? '已核对本机字体与已加载的网页字体。'
                : measured.fontAccess === 'denied'
                  ? '未获得本机字体权限；本机字体标为未验证。'
                  : '此环境不支持本机字体枚举；本机字体标为未验证。'}
            </p>
            {measured.fonts.length > 0 && (
              <details>
                <summary className="cursor-pointer">
                  查看 {measured.fonts.length} 组实际字体设置
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
                          ? '可用'
                          : font.status === 'fallback'
                            ? '发生回退'
                            : font.status === 'generic'
                              ? '系统通用字体'
                              : '未验证'}
                      </span>{' '}
                      · {font.requested}
                      {font.status === 'fallback' && (
                        <span> → {font.resolved ?? '浏览器默认'}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <p>检查依据为当前画布的排版范围与字体设置；逐字形覆盖和最终观感请结合画布确认。</p>
          </>
        ) : (
          <>
            <p>{checked ? '页面内容已改变，请重新检查。' : '本机字体与文字实际排版尚未检查。'}</p>
            {fonts.length > 0 && <p>页内声明：{fonts.join('、')}。</p>}
            <p>点击后检查继承字体、富文本、表格与公式；检查结果不会改变版式。</p>
          </>
        )}
      </div>
    </section>
  );
}
