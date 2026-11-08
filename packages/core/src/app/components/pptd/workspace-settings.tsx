import { Keyboard, RotateCcw } from 'lucide-react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import { ThemeToggle } from '../theme-toggle';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { FontLibrary } from './font-library';
import { HuandengLanguageMenu } from './language-menu';
import { SnappingToggle } from './snapping-toggle';

export function WorkspaceSettings({
  open,
  onOpenChange,
  navigation,
  inspector,
  notes,
  onNavigation,
  onInspector,
  onNotes,
  onKeyboard,
  onReset,
  snapping,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigation: boolean;
  inspector: boolean;
  notes: boolean;
  onNavigation: (open: boolean) => void;
  onInspector: (open: boolean) => void;
  onNotes: (open: boolean) => void;
  onKeyboard: () => void;
  onReset: () => void;
  snapping: { enabled: boolean; disabled: boolean; onChange: (value: boolean) => void };
}) {
  const { t } = useHuandengLocale();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85dvh] overflow-y-auto sm:max-w-md"
        data-hd-workspace-settings
      >
        <DialogHeader>
          <DialogTitle>{t('Workspace settings')}</DialogTitle>
          <DialogDescription>
            {t('Arrange your editing space and choose interface preferences.')}
          </DialogDescription>
        </DialogHeader>
        <section className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">{t('Panels')}</h3>
          {[
            [t('Project navigation'), navigation, onNavigation],
            [t('Inspector'), inspector, onInspector],
            [t('Speaker notes'), notes, onNotes],
          ].map(([label, checked, change]) => (
            <label key={String(label)} className="flex items-center justify-between text-sm">
              <span>{String(label)}</span>
              <input
                type="checkbox"
                checked={Boolean(checked)}
                onChange={(event) => (change as (value: boolean) => void)(event.target.checked)}
              />
            </label>
          ))}
          <p className="text-xs leading-relaxed text-muted-foreground">
            {t('Drag panel edges to resize. Use the Notes header to change its dock.')}
          </p>
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw />
            {t('Reset workspace layout')}
          </Button>
        </section>
        <section className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">{t('Editing')}</h3>
          <SnappingToggle {...snapping} />
          <p className="text-xs text-muted-foreground">
            {t('Hold Alt to temporarily bypass snapping.')}
          </p>
          <Button variant="outline" size="sm" onClick={onKeyboard}>
            <Keyboard />
            {t('Keyboard shortcuts')}
            <kbd className="ml-auto text-xs text-muted-foreground">F1</kbd>
          </Button>
        </section>
        <FontLibrary />
        <section className="flex items-center gap-3 border-t pt-4">
          <h3 className="flex-1 text-sm font-semibold">{t('Appearance and language')}</h3>
          <HuandengLanguageMenu />
          <ThemeToggle />
        </section>
      </DialogContent>
    </Dialog>
  );
}
