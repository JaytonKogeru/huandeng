import { useEffect, useId, useState } from 'react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { elementLabel } from '@/lib/pptd-element-label';
import { projectSlideTitle } from '@/lib/pptd-project-source';
import {
  type CapturedTitleStyle,
  capturedTitleStyleIsCurrent,
  captureTitleStyle,
  commitPreparedTitleStyle,
  type PreparedTitleStylePreview,
  prepareTitleStylePreview,
  titleLayoutObjects,
  titleStylePreviewIsCurrent,
} from '@/lib/pptd-title-layout';
import type { DeckSnapshot, PageSnapshot } from '../../../pptd/types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { ProjectSlidePreview } from './project-source-picker';
import type { RecipePanelProps } from './recipe-panel';

const fieldClass =
  'h-8 w-full min-w-0 rounded-md border border-input bg-background px-2 text-xs text-foreground';

interface ReferenceCapture {
  style: CapturedTitleStyle;
  page: PageSnapshot;
  snapshot: Pick<DeckSnapshot, 'size' | 'manifest'>;
  label: string;
}

export function TitleLayoutPanel({
  snapshot,
  page,
  selectedIds = [],
  onSelectTitle,
  onApply,
  disabled,
}: RecipePanelProps) {
  useHuandengLocale();
  const prefix = useId();
  const [referencePageId, setReferencePageId] = useState('');
  const [referenceElementId, setReferenceElementId] = useState('');
  const [targetElementId, setTargetElementId] = useState('');
  const [captured, setCaptured] = useState<ReferenceCapture | null>(null);
  const [prepared, setPrepared] = useState<PreparedTitleStylePreview | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const reference = snapshot.pages.find((item) => item.pageId === referencePageId);
  const previewPage = captured?.page ?? reference;
  const previewSnapshot = captured?.snapshot ?? snapshot;
  const targets = titleLayoutObjects(page, true);
  const sources = reference ? titleLayoutObjects(reference) : [];
  const selectedTitleId =
    selectedIds.length === 1 && targets.some((element) => element.elementId === selectedIds[0])
      ? selectedIds[0]
      : '';
  useEffect(() => {
    if (selectedTitleId) setTargetElementId(selectedTitleId);
  }, [selectedTitleId]);
  const inactive = disabled || pending || !snapshot.writable;
  const referenceStale = !!captured && !capturedTitleStyleIsCurrent(captured.style, snapshot);
  const previewCurrent =
    !!prepared &&
    !!captured &&
    titleStylePreviewIsCurrent(prepared, snapshot, page, targetElementId, captured.style) &&
    (!selectedTitleId || targetElementId === selectedTitleId);
  const valid =
    captured?.style.referencePageId === referencePageId &&
    captured?.style.referenceElementId === referenceElementId &&
    !!targets.find((item) => item.elementId === targetElementId) &&
    (referencePageId !== page.pageId || referenceElementId !== targetElementId);

  const capture = (elementId: string) => {
    setError(null);
    setMessage(null);
    setCaptured(null);
    setPrepared(null);
    if (!elementId || !reference) return;
    try {
      const style = captureTitleStyle(snapshot, reference.pageId, elementId);
      const element = sources.find((item) => item.elementId === elementId);
      setCaptured({
        style,
        page: structuredClone(reference),
        snapshot: structuredClone({ size: snapshot.size, manifest: snapshot.manifest }),
        label: element ? elementLabel(element) : elementId,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const prepare = () => {
    setError(null);
    setMessage(null);
    try {
      if (!captured) throw new Error('Choose a reference title to capture its style.');
      setPrepared(
        prepareTitleStylePreview({
          snapshot,
          capturedStyle: captured.style,
          targetPage: page,
          targetElementId,
        }),
      );
      setPreviewOpen(true);
    } catch (cause) {
      setPrepared(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };

  const apply = async () => {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      if (!captured || !prepared || !previewCurrent)
        throw new Error('The slide or Project changed. Refresh the title preview before applying.');
      await commitPreparedTitleStyle(
        prepared,
        snapshot,
        page,
        targetElementId,
        captured.style,
        onApply,
      );
      setPrepared(null);
      setPreviewOpen(false);
      setMessage('Title style applied. Use Undo to restore the previous style.');
    } catch (cause) {
      setPrepared(null);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setPending(false);
    }
  };

  const applyButton = (
    <Button
      type="button"
      size="sm"
      data-hd-title-apply
      disabled={inactive || !valid || !previewCurrent}
      onClick={() => void apply()}
    >
      {pending ? t('正在保存…') : t('Apply to chosen title')}
    </Button>
  );

  return (
    <section className="space-y-3" aria-label={t('Match title style')} data-hd-title-layout>
      <div className="space-y-1">
        <h4 className="text-xs font-medium">{t('Match title style')}</h4>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t(
            'Use an existing Slide title or Section cover as your reference. Copy its position and text formatting to one chosen title.',
          )}
        </p>
      </div>
      <fieldset className="space-y-3" disabled={inactive}>
        <label
          htmlFor={`${prefix}-reference-slide`}
          className="block space-y-1 text-[11px] text-muted-foreground"
        >
          <span>{t('Reference Slide')}</span>
          <select
            id={`${prefix}-reference-slide`}
            data-hd-title-reference-page
            className={fieldClass}
            value={referencePageId}
            onChange={(event) => {
              setReferencePageId(event.target.value);
              setReferenceElementId('');
              setCaptured(null);
              setPrepared(null);
              setError(null);
              setMessage(null);
            }}
          >
            <option value="">{t('Choose a reference Slide')}</option>
            {snapshot.pages
              .filter((item) => item.state === 'active')
              .map((item, index) => (
                <option key={item.pageId} value={item.pageId}>
                  {index + 1}. {projectSlideTitle(item)} · {item.shortCode ?? item.pageId}
                </option>
              ))}
          </select>
        </label>
        <label
          htmlFor={`${prefix}-reference-title`}
          className="block space-y-1 text-[11px] text-muted-foreground"
        >
          <span>{t('Reference title object')}</span>
          <select
            id={`${prefix}-reference-title`}
            data-hd-title-reference-object
            className={fieldClass}
            value={referenceElementId}
            disabled={inactive || !reference}
            onChange={(event) => {
              setReferenceElementId(event.target.value);
              capture(event.target.value);
            }}
          >
            <option value="">{t('Choose title text')}</option>
            {sources.map((element) => (
              <option key={element.elementId} value={element.elementId}>
                {elementLabel(element).slice(0, 100)} · {element.elementId}
              </option>
            ))}
          </select>
        </label>
        {previewPage && (
          <div
            className="space-y-2"
            data-hd-captured-title-style={captured ? captured.style.referenceElementId : undefined}
          >
            <p className="text-[11px] font-medium">
              {t(captured ? 'Captured reference style' : 'Reference Slide preview')}
            </p>
            <div
              className="overflow-hidden rounded-sm border border-border"
              style={{ aspectRatio: `${previewSnapshot.size[0]} / ${previewSnapshot.size[1]}` }}
            >
              <ProjectSlidePreview page={previewPage} snapshot={previewSnapshot} />
            </div>
            {captured && (
              <p className="break-words text-[11px] text-muted-foreground">{captured.label}</p>
            )}
            {captured && (
              <div
                className="space-y-1 text-[11px] text-muted-foreground"
                data-hd-title-reference-state={referenceStale ? 'stale' : 'current'}
              >
                <p>
                  {t(
                    referenceStale
                      ? 'Reference changed. The captured style is retained until refreshed.'
                      : 'Reference matches the captured version.',
                  )}
                </p>
                <dl
                  className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 break-words"
                  data-hd-title-captured-values
                >
                  {Object.entries(captured.style.fields).map(([field, value]) => (
                    <div key={field} className="contents">
                      <dt>{t(titleStyleFieldLabel(field))}</dt>
                      <dd>{titleStyleFieldValue(field, value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {captured && (
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t('Apply uses this captured style. Refresh to include later reference edits.')}
              </p>
            )}
            {referenceElementId && (
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={
                  inactive || !sources.some((item) => item.elementId === referenceElementId)
                }
                onClick={() => capture(referenceElementId)}
              >
                {t('Refresh reference style')}
              </Button>
            )}
          </div>
        )}
        <label
          htmlFor={`${prefix}-target-title`}
          className="block space-y-1 text-[11px] text-muted-foreground"
        >
          <span>{t('Title on the current Slide')}</span>
          <select
            id={`${prefix}-target-title`}
            data-hd-title-target-object
            className={fieldClass}
            value={targetElementId}
            onChange={(event) => {
              setTargetElementId(event.target.value);
              setPrepared(null);
              setMessage(null);
              if (event.target.value) onSelectTitle?.(event.target.value);
            }}
          >
            <option value="">{t('Choose title text')}</option>
            {targets.map((element) => (
              <option key={element.elementId} value={element.elementId}>
                {elementLabel(element).slice(0, 100)} · {element.elementId}
              </option>
            ))}
          </select>
        </label>
        {!targets.length && (
          <p className="text-[11px] text-muted-foreground">
            {t('Add a text object, or ungroup a title to change its layout independently.')}
          </p>
        )}
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t(
            'Only the chosen title changes. Baseline font, size, color, alignment and spacing replace inline overrides. Wording and emphasis are retained.',
          )}
        </p>
        {prepared && !previewCurrent && (
          <p
            role="status"
            data-hd-title-preview-stale
            className="text-xs text-amber-700 dark:text-amber-300"
          >
            {t('The slide or Project changed. Refresh the title preview before applying.')}
          </p>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-hd-title-preview-open
          disabled={inactive || !valid}
          onClick={prepare}
        >
          {t(prepared ? 'Refresh title preview' : 'Preview title on full slide')}
        </Button>
        {!previewOpen && applyButton}
      </fieldset>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {t(error)}
        </p>
      )}
      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {t(message)}
        </p>
      )}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          className="flex h-[min(86vh,760px)] w-[94vw] max-w-[1200px] flex-col overflow-hidden sm:max-w-[1200px]"
          onKeyDown={(event) => event.stopPropagation()}
        >
          <DialogHeader>
            <DialogTitle>{t('Title style preview')}</DialogTitle>
            <DialogDescription>
              {t(
                'Preview is local. Apply saves this exact prepared title style; wording and other objects are retained.',
              )}
            </DialogDescription>
          </DialogHeader>
          {prepared && !previewCurrent && (
            <p role="status" data-hd-title-preview-stale>
              {t('The slide or Project changed. Refresh the title preview before applying.')}
            </p>
          )}
          <div
            data-hd-title-preview={previewCurrent ? 'current' : 'stale'}
            className="relative min-h-0 flex-1 bg-canvas p-3"
          >
            {prepared && (
              <ProjectSlidePreview page={prepared.page} snapshot={prepared.snapshot} immediate />
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={inactive || !valid}
              onClick={prepare}
            >
              {t('Refresh title preview')}
            </Button>
            {applyButton}
          </div>
          {error && (
            <p role="alert" className="text-xs text-destructive">
              {t(error)}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function titleStyleFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    bounds: 'Position and size',
    rotation: 'Rotation',
    'content.fontFamily': 'Font family',
    'content.fontSize': 'Font size',
    'content.bold': 'Bold',
    'content.italic': 'Italic',
    'content.underline': 'Underline',
    'content.color': 'Text color',
    'content.align': 'Alignment',
    'content.lineHeight': 'Line height',
    'content.lineHeightPx': 'Line height (px)',
    'content.letterSpacing': 'Letter spacing',
    'content.wrap': 'Wrap text',
    'content.textDirection': 'Text direction',
  };
  return labels[field] ?? field;
}

function titleStyleFieldValue(field: string, value: unknown): string {
  if (typeof value === 'boolean') return t(value ? 'Yes' : 'No');
  if (field === 'content.align' && Array.isArray(value))
    return value.map((part) => t(String(part))).join(' / ');
  if (field === 'content.textDirection') return t(String(value));
  return typeof value === 'string' ? value : JSON.stringify(value);
}
