import { Trash2 } from 'lucide-react';
import { type ReactNode, useEffect, useId, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { projectSlideTitle } from '@/lib/pptd-project-source';
import type { ResolvedProjectSection } from '../../../pptd/project-model';
import type { DeckSnapshot } from '../../../pptd/types';
import { Button } from '../ui/button';
import { ProjectSlidePreview } from './project-source-picker';

const fieldClass =
  'w-full min-w-0 rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50';

export function ProjectSectionEditor({
  resolved,
  snapshot,
  disabled,
  onRename,
  onRemove,
  onSetRange,
  onSelectPage,
  children,
}: {
  resolved: ResolvedProjectSection;
  snapshot: DeckSnapshot;
  disabled: boolean;
  onRename: (title: string) => void;
  onRemove: () => void;
  onSetRange: (startPageId: string, endPageId: string) => string | null;
  onSelectPage: (pageId: string) => void;
  children?: ReactNode;
}) {
  useHuandengLocale();
  const prefix = useId();
  const { section, pageIds } = resolved;
  const pages = snapshot.pages.filter((page) => page.state === 'active');
  const initialStart = section.range?.startPageId ?? pageIds[0] ?? pages[0]?.pageId ?? '';
  const initialEnd = section.range?.endPageId ?? pageIds.at(-1) ?? initialStart;
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [rangeError, setRangeError] = useState<string | null>(null);
  useEffect(() => {
    setStart(initialStart);
    setEnd(initialEnd);
    setRangeError(null);
  }, [initialStart, initialEnd]);
  const unchanged = !!section.range && start === initialStart && end === initialEnd;
  return (
    <section
      className="space-y-3 rounded-md border border-border bg-background p-2.5"
      data-hd-project-section={section.id}
    >
      <div className="flex items-center gap-1">
        <input
          aria-label={t('Section name')}
          className={`${fieldClass} font-medium`}
          value={section.title}
          maxLength={240}
          disabled={disabled}
          onChange={(event) => onRename(event.target.value)}
        />
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={t('Remove Section {title}', { title: section.title })}
          title={t('Remove Section')}
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
      <p className="text-[11px] tabular-nums text-muted-foreground" data-hd-section-range>
        {resolved.contiguous && resolved.startPosition !== null
          ? t('Positions {start}–{end} · {count} slides', {
              start: resolved.startPosition,
              end: resolved.endPosition ?? resolved.startPosition,
              count: pageIds.length,
            })
          : t('{count} slides', { count: pageIds.length })}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ['start', start, setStart],
            ['end', end, setEnd],
          ] as const
        ).map(([name, value, update]) => (
          <label
            key={name}
            htmlFor={`${prefix}-${name}`}
            className="min-w-0 space-y-1 text-[10px] text-muted-foreground"
          >
            <span>{name === 'start' ? t('Start Position') : t('End Position')}</span>
            <select
              id={`${prefix}-${name}`}
              className={fieldClass}
              value={value}
              disabled={disabled || !pages.length}
              onChange={(event) => {
                update(event.target.value);
                setRangeError(null);
              }}
            >
              {!pages.some((page) => page.pageId === value) && (
                <option value={value}>
                  {value ? t('Unavailable boundary') : t('Choose a slide')}
                </option>
              )}
              {pages.map((page, index) => (
                <option key={page.pageId} value={page.pageId}>
                  {index + 1}. {projectSlideTitle(page)} · {page.shortCode ?? page.pageId}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <Button
        size="xs"
        variant="outline"
        disabled={disabled || !start || !end || unchanged}
        data-hd-set-section-range={section.id}
        onClick={() => setRangeError(onSetRange(start, end))}
      >
        {t('Set range')}
      </Button>
      {!section.range && pageIds.length > 0 && (
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {resolved.contiguous
            ? t(
                'Fixed membership. Set a range to include new slides inserted between its boundaries.',
              )
            : t(
                'This Section has custom membership. Its saved order is preserved until you choose a continuous range.',
              )}
        </p>
      )}
      {rangeError && (
        <p role="alert" className="text-[11px] text-destructive">
          {t(rangeError)}
        </p>
      )}
      {resolved.diagnostics.map((diagnostic) => (
        <p
          key={`${diagnostic.code}-${diagnostic.pageId ?? diagnostic.message}`}
          role="alert"
          className="text-[11px] text-destructive"
        >
          {t(diagnostic.message)}
        </p>
      ))}
      <details open>
        <summary className="cursor-pointer text-[11px] font-medium">
          {t('Slides in this Section')}
        </summary>
        <div className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain">
          {pageIds.map((pageId) => {
            const position = pages.findIndex((page) => page.pageId === pageId);
            const page = pages[position];
            return (
              <button
                type="button"
                key={pageId}
                disabled={!page}
                title={`${t('Slide ID')}: ${page?.shortCode ?? pageId}\n${t('Permanent ID')}: ${pageId}`}
                className="flex w-full items-center gap-2 rounded px-1 py-1 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
                onClick={() => onSelectPage(pageId)}
              >
                {page && (
                  <span className="block h-7 w-12 shrink-0 overflow-hidden rounded">
                    <ProjectSlidePreview page={page} snapshot={snapshot} />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px]">
                    {page ? projectSlideTitle(page) : t('Unavailable slide')}
                  </span>
                  <span className="block text-[10px] text-muted-foreground">
                    {page ? `${t('Position {position}', { position: position + 1 })} · ` : ''}
                    {t('Slide ID')} {page?.shortCode ?? pageId}
                  </span>
                </span>
              </button>
            );
          })}
          {!pageIds.length && (
            <p className="py-2 text-[11px] text-muted-foreground">
              {t('Choose Start and End Positions, then set this Section’s range.')}
            </p>
          )}
        </div>
      </details>
      {children}
    </section>
  );
}
