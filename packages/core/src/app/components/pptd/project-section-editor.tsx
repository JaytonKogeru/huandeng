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
  onSetStart,
  onSetFrontMatter,
  onSelectPage,
  children,
  showMembers = true,
}: {
  resolved: ResolvedProjectSection;
  snapshot: DeckSnapshot;
  defaultStartPageId?: string | null;
  disabled: boolean;
  onRename: (title: string) => void;
  onRemove: () => void;
  onSetStart: (startPageId: string) => string | null;
  onSetFrontMatter: (frontMatter: boolean) => string | null;
  onSelectPage: (pageId: string) => void;
  children?: ReactNode;
  showMembers?: boolean;
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
  const [start, setStart] = useState(initialStart);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState('');
  useEffect(() => {
    setStart(initialStart);
    setRangeError(null);
  }, [initialStart]);
  const unchanged = section.startPageId === start;
  const legacyMembership = !section.startPageId && (Boolean(section.range) || pageIds.length > 0);
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
        <details className="ml-auto min-w-0 text-right">
          <summary className="cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-ring">
            {t('Section ID')}
          </summary>
          <span className="mt-1 block max-w-56 break-all font-mono">{section.id}</span>
        </details>
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
      <label htmlFor={`${prefix}-start`} className="block space-y-1 text-[11px]">
        <span className="text-muted-foreground">{t('First Slide')}</span>
        <select
          id={`${prefix}-start`}
          className={fieldClass}
          value={start}
          disabled={disabled || !pages.length}
          data-hd-section-first-slide
          onChange={(event) => {
            setStart(event.target.value);
            setRangeError(null);
          }}
        >
          {!pages.some((page) => page.pageId === start) && (
            <option value={start}>{start ? t('Unavailable boundary') : t('Choose a slide')}</option>
          )}
          {pages.map((page, index) => (
            <option key={page.pageId} value={page.pageId}>
              {index + 1}. {projectSlideTitle(page)} · {page.shortCode ?? page.pageId}
            </option>
          ))}
        </select>
      </label>
      {cover && (
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
      <Button
        size="xs"
        variant="outline"
        disabled={disabled || !start || unchanged}
        data-hd-set-section-start={section.id}
        onClick={() => setRangeError(onSetStart(start))}
      >
        {legacyMembership ? t('Use first-Slide boundaries') : t('Set first Slide')}
      </Button>
      <p className="text-[10px] leading-relaxed text-muted-foreground">
        {t(
          'Includes this Slide and follows Main order until the next Section. The last Section continues to the end.',
        )}
      </p>
      {legacyMembership && (
        <p
          className="rounded border border-amber-300/50 bg-amber-50/50 p-2 text-[11px] leading-relaxed text-amber-900 dark:bg-amber-950/20 dark:text-amber-100"
          data-hd-section-legacy
        >
          {t(
            'This older Section has saved membership. Its Slides stay unchanged until you apply a first-Slide boundary. Review the resulting range before saving.',
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
      {showMembers && (
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
                {t('Choose the first Slide, then click Set first Slide.')}
              </p>
            )}
          </div>
        </details>
      )}
      {children}
    </section>
  );
}
