import { Bot, NotebookPen, Type } from 'lucide-react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import type { PageSnapshot } from '../../../pptd/types';
import { Button } from '../ui/button';

export type EmptySlideActions = {
  onAddTitle: () => void;
  onStory: () => void;
  onConnect: () => void;
};

export function EmptySlideStart({
  page,
  disabled,
  actions,
}: {
  page: PageSnapshot;
  disabled?: boolean;
  actions?: EmptySlideActions;
}) {
  const { t } = useHuandengLocale();
  if (!actions || disabled || page.versionId || page.occurrenceId || page.data.elements.length)
    return null;
  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-background px-4 py-2"
      data-hd-empty-slide-start
    >
      <span className="mr-2 text-xs text-muted-foreground">{t('Start this slide')}</span>
      <Button size="xs" variant="secondary" onClick={actions.onAddTitle}>
        <Type />
        {t('Add a title')}
      </Button>
      <Button size="xs" variant="ghost" onClick={actions.onStory}>
        <NotebookPen />
        {t('Set page intent')}
      </Button>
      <Button size="xs" variant="ghost" onClick={actions.onConnect}>
        <Bot />
        {t('Connect an Agent')}
      </Button>
    </div>
  );
}
