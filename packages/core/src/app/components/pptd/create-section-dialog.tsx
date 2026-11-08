import { useId, useRef, useState } from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import { projectSlideTitle } from '@/lib/pptd-project-source';
import { sectionAtBoundary } from '@/lib/pptd-section-actions';
import type { SlideInsertionBoundary } from '@/lib/pptd-thumbnail-sections';
import { type ResolvedProjectSection, resolveProjectSections } from '../../../pptd/project-model';
import type { DeckSnapshot } from '../../../pptd/types';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';

export function CreateSectionDialog({
  snapshot,
  boundary,
  disabled,
  onClose,
  onCreate,
}: {
  snapshot: DeckSnapshot;
  boundary: SlideInsertionBoundary;
  disabled: boolean;
  onClose: () => void;
  onCreate: (definition: { id: string; title: string; frontMatter: boolean }) => Promise<unknown>;
}) {
  const { t } = useHuandengLocale();
  const inputId = useId();
  const id = useRef(crypto.randomUUID());
  const first = snapshot.pages.find((page) => page.pageId === boundary.beforePageId);
  const [title, setTitle] = useState(first ? projectSlideTitle(first) : '');
  const [frontMatter, setFrontMatter] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  let preview: ResolvedProjectSection | undefined;
  let previewError: string | undefined;
  try {
    const next = sectionAtBoundary(snapshot, boundary, {
      id: id.current,
      title: title.trim() || 'New Section',
      frontMatter,
    });
    preview = resolveProjectSections(snapshot, next).find((item) => item.section.id === id.current);
  } catch (failure) {
    previewError = failure instanceof Error ? failure.message : String(failure);
  }
  return (
    <Dialog open onOpenChange={(open) => !open && !saving && onClose()}>
      <DialogContent data-hd-create-section>
        <DialogHeader>
          <DialogTitle>{t('Create Section here')}</DialogTitle>
          <DialogDescription>
            {t('Organize the following Slides through the next Section boundary.')}
          </DialogDescription>
        </DialogHeader>
        <label htmlFor={inputId} className="space-y-2 text-sm">
          <span>{t('Section name')}</span>
          <Input
            id={inputId}
            value={title}
            maxLength={240}
            disabled={saving || disabled}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        {first && (
          <p className="text-xs text-muted-foreground">
            {t('First Slide')} · {first.shortCode ?? first.pageId} · {projectSlideTitle(first)}
          </p>
        )}
        {boundary.afterPageId === null && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={frontMatter}
              disabled={saving || disabled}
              onChange={(event) => setFrontMatter(event.target.checked)}
            />
            {t('Front matter (Section 00)')}
          </label>
        )}
        {preview && (
          <p className="text-sm" data-hd-new-section-range>
            {t('Section {position}', {
              position: String(preview.sectionPosition).padStart(2, '0'),
            })}{' '}
            ·{' '}
            {t('Positions {start}–{end} · {count} slides', {
              start: preview.startPosition ?? 0,
              end: preview.endPosition ?? 0,
              count: preview.pageIds.length,
            })}
          </p>
        )}
        {(error || previewError) && (
          <p role="alert" className="text-xs text-destructive">
            {t(error || previewError || '')}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" disabled={saving} onClick={onClose}>
            {t('Cancel')}
          </Button>
          <Button
            disabled={disabled || saving || !title.trim() || !!previewError}
            onClick={() => {
              setSaving(true);
              setError(null);
              void onCreate({ id: id.current, title: title.trim(), frontMatter })
                .then(onClose, (failure) =>
                  setError(failure instanceof Error ? failure.message : String(failure)),
                )
                .finally(() => setSaving(false));
            }}
          >
            {saving ? t('Saving…') : t('Create Section')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
