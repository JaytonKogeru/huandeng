import { Copy, Trash2 } from 'lucide-react';
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
  defaultStartPageId,
  disabled,
  onRename,
  onRemove,
  onSetRange,
  onSetStart,
  onSetFrontMatter,
  onSelectPage,
  children,
}: {
  resolved: ResolvedProjectSection;
  snapshot: DeckSnapshot;
  defaultStartPageId?: string | null;
  disabled: boolean;
  onRename: (title: string) => void;
  onRemove: () => void;
  onSetRange: (startPageId: string, endPageId: string) => string | null;
  onSetStart: (startPageId: string) => string | null;
  onSetFrontMatter: (frontMatter: boolean) => string | null;
  onSelectPage: (pageId: string) => void;
  children?: ReactNode;
}) {
  useHuandengLocale();
  const prefix = useId();
  const { section, pageIds } = resolved;
  const pages = snapshot.pages.filter((page) => page.state === 'active');
  const initialStart =
    section.startPageId ??
    section.range?.startPageId ??
    pageIds[0] ??
    defaultStartPageId ??
    pages[0]?.pageId ??
    '';
  const initialEnd = section.range?.endPageId ?? pageIds.at(-1) ?? initialStart;
  const initialMode = section.startPageId
    ? 'cover'
    : section.range
      ? 'range'
      : pageIds.length
        ? 'members'
        : 'cover';
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(initialEnd);
  const [mode, setMode] = useState<'cover' | 'range' | 'members'>(initialMode);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  useEffect(() => {
    setStart(initialStart);
    setEnd(initialEnd);
    setMode(initialMode);
    setRangeError(null);
  }, [initialStart, initialEnd, initialMode]);
  const unchanged =
    mode === 'cover'
      ? section.startPageId === start
      : mode === 'range'
        ? !!section.range && start === initialStart && end === initialEnd
        : true;
  const cover = pages.find((page) => page.pageId === start);
  return (
    <section
      className="space-y-3 rounded-md border border-border bg-background p-2.5"
      data-hd-project-section={section.id}
    >
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="shrink-0 font-medium" data-hd-section-number>
          {resolved.sectionPosition === null
            ? t('Section')
            : t('Section {position}', {
                position: String(resolved.sectionPosition).padStart(2, '0'),
              })}
        </span>
        <span
          className="min-w-0 flex-1 truncate font-mono"
          title={`${t('Section ID')}: ${section.id}`}
        >
          {t('Section ID')} · {section.id}
        </span>
        <Button
          size="icon-xs"
          variant="ghost"
          aria-label={t('Copy Section ID')}
          title={t('Copy Section ID')}
          onClick={() => {
            void navigator.clipboard.writeText(section.id).then(
              () => setCopyStatus(t('Section ID copied.')),
              () => setCopyStatus(t('Could not copy Section ID.')),
            );
          }}
        >
          <Copy />
        </Button>
      </div>
      <p className="sr-only" role="status">
        {copyStatus}
      </p>
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
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <input
          type="checkbox"
          checked={section.frontMatter === true}
          disabled={disabled || (!section.frontMatter && resolved.startPosition !== 1)}
          onChange={(event) => setRangeError(onSetFrontMatter(event.target.checked))}
        />
        {t('Front matter (Section 00)')}
      </label>
      <label htmlFor={`${prefix}-mode`} className="block space-y-1 text-[11px]">
        <span className="text-muted-foreground">{t('Section membership')}</span>
        <select
          id={`${prefix}-mode`}
          className={fieldClass}
          value={mode}
          disabled={disabled}
          data-hd-section-membership
          onChange={(event) => {
            setMode(event.target.value as 'cover' | 'range' | 'members');
            setRangeError(null);
          }}
        >
          <option value="cover">{t('First Slide to next Section')}</option>
          <option value="range">{t('Fixed range')}</option>
          {initialMode === 'members' && <option value="members">{t('Saved members')}</option>}
        </select>
      </label>
      {mode !== 'members' && (
        <div className={mode === 'range' ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
          {(
            [
              ['start', start, setStart],
              ['end', end, setEnd],
            ] as const
          )
            .filter(([name]) => mode === 'range' || name === 'start')
            .map(([name, value, update]) => (
              <label
                key={name}
                htmlFor={`${prefix}-${name}`}
                className="min-w-0 space-y-1 text-[10px] text-muted-foreground"
              >
                <span>
                  {name === 'start'
                    ? mode === 'cover'
                      ? t('First Slide')
                      : t('Start Position')
                    : t('End Position')}
                </span>
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
      )}
      {mode === 'cover' && cover && (
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded border border-border p-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40"
          aria-label={t('Open first Slide: {title}', { title: projectSlideTitle(cover) })}
          onClick={() => onSelectPage(cover.pageId)}
        >
          <span
            className="block w-20 shrink-0 overflow-hidden rounded"
            style={{ aspectRatio: `${snapshot.size[0]} / ${snapshot.size[1]}` }}
          >
            <ProjectSlidePreview page={cover} snapshot={snapshot} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block line-clamp-2 text-[11px]">{projectSlideTitle(cover)}</span>
            <span className="block text-[10px] text-muted-foreground">
              {t('Slide ID')} {cover.shortCode ?? cover.pageId}
            </span>
          </span>
        </button>
      )}
      {mode !== 'members' && (
        <Button
          size="xs"
          variant="outline"
          disabled={disabled || !start || (mode === 'range' && !end) || unchanged}
          data-hd-set-section-range={mode === 'range' ? section.id : undefined}
          data-hd-set-section-start={mode === 'cover' ? section.id : undefined}
          onClick={() =>
            setRangeError(mode === 'cover' ? onSetStart(start) : onSetRange(start, end))
          }
        >
          {mode === 'cover' ? t('Set first Slide') : t('Set range')}
        </Button>
      )}
      {mode === 'cover' && (
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          {t(
            'Includes this Slide and follows Main order until the next Section. The last Section continues to the end.',
          )}
        </p>
      )}
      {mode === 'members' && (
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
      <details>
        <summary className="cursor-pointer text-[11px] font-medium">
          {t('Slides in this Section')} · {pageIds.length}
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
              {mode === 'cover'
                ? t('Choose the first Slide, then click Set first Slide.')
                : t('Choose Start and End Positions, then set this Section’s range.')}
            </p>
          )}
        </div>
      </details>
      {children}
    </section>
  );
}
