import { ClipboardList } from 'lucide-react';
import { useMemo } from 'react';
import { requestedPageFonts, technicalDiagnostics } from '../../../pptd/technical-diagnostics';
import type { Diagnostic, PageSize, PageSnapshot } from '../../../pptd/types';
import { Button } from '../ui/button';

export interface TechnicalQaPanelProps {
  page: PageSnapshot;
  size: PageSize;
  diagnostics: Diagnostic[];
  onSelect: (elementId: string) => void;
}

export function TechnicalQaPanel({ page, size, diagnostics, onSelect }: TechnicalQaPanelProps) {
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
      [...local, ...supplied].map((item) => [
        `${item.code}:${item.elementId ?? ''}:${item.path ?? item.message}`,
        item,
      ]),
    );
    const rank = { error: 0, warning: 1, info: 2 };
    return [...unique.values()].sort((a, b) => rank[a.severity] - rank[b.severity]);
  }, [page, size, diagnostics]);
  const fonts = useMemo(() => requestedPageFonts(page), [page]);
  const errors = issues.filter((item) => item.severity === 'error').length;
  const warnings = issues.filter((item) => item.severity === 'warning').length;

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
        <p>
          字体可用性：未验证。
          {fonts.length ? `页内请求：${fonts.join('、')}。` : '此页使用继承字体或未声明字体。'}
        </p>
        <p>目标机器的字体安装、文字实际溢出仍需视觉检查；不会自动改动排版。</p>
      </div>
    </section>
  );
}
