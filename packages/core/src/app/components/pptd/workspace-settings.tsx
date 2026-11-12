import { Keyboard, PanelLeft, PanelTop, RotateCcw, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import { useWorkspaceTabLayout } from '@/lib/use-workspace-tab-layout';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { FontLibrary } from './font-library';
import { SnappingToggle } from './snapping-toggle';

const selectClass =
  'h-9 min-w-0 w-full rounded border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function WorkspaceSettings({
  open,
  onOpenChange,
  navigation,
  inspector,
  notes,
  notesDock,
  onNavigation,
  onInspector,
  onNotes,
  onNotesDock,
  onKeyboard,
  onReset,
  snapping,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigation: boolean;
  inspector: boolean;
  notes: boolean;
  notesDock: 'bottom' | 'right';
  onNavigation: (open: boolean) => void;
  onInspector: (open: boolean) => void;
  onNotes: (open: boolean) => void;
  onNotesDock: (dock: 'bottom' | 'right') => void;
  onKeyboard: () => void;
  onReset: () => void;
  snapping: { enabled: boolean; disabled: boolean; onChange: (value: boolean) => void };
}) {
  const { locale, t, setLocale } = useHuandengLocale();
  const { theme, setTheme } = useTheme();
  const tabs = useWorkspaceTabLayout(open);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [languageError, setLanguageError] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[min(680px,calc(100dvh-2rem))] grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden p-5 sm:max-w-[680px]"
        showCloseButton={false}
        data-hd-workspace-settings
      >
        <DialogHeader className="pr-8">
          <DialogTitle>{t('Workspace settings')}</DialogTitle>
          <DialogDescription>
            {t('Choose a setting group. Changes apply immediately.')}
          </DialogDescription>
        </DialogHeader>
        <DialogClose
          aria-label={t('关闭')}
          className="absolute top-3.5 right-3.5 inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
        >
          <X className="size-4" />
        </DialogClose>
        <Tabs defaultValue="workspace" className="min-h-0 gap-4">
          <TabsList aria-label={t('Workspace setting groups')} className="w-full shrink-0">
            <TabsTrigger value="workspace">{t('Workspace')}</TabsTrigger>
            <TabsTrigger value="editing">{t('Editing')}</TabsTrigger>
            <TabsTrigger value="fonts">{t('Fonts')}</TabsTrigger>
          </TabsList>
          <TabsContent
            value="workspace"
            keepMounted
            className="min-h-0 space-y-5 overflow-y-auto pr-1"
          >
            <section className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="block font-medium">{t('Interface theme')}</span>
                <select
                  className={selectClass}
                  aria-label={t('Interface theme')}
                  value={theme ?? 'system'}
                  onChange={(event) => setTheme(event.target.value)}
                >
                  <option value="system">{t('Follow system')}</option>
                  <option value="light">{t('Light theme')}</option>
                  <option value="dark">{t('Dark theme')}</option>
                </select>
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="block font-medium">{t('界面语言')}</span>
                <select
                  className={selectClass}
                  aria-label={t('界面语言')}
                  value={locale}
                  disabled={languageSaving}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (next !== 'en' && next !== 'zh-CN') return;
                    setLanguageSaving(true);
                    setLanguageError(false);
                    void setLocale(next)
                      .catch(() => setLanguageError(true))
                      .finally(() => setLanguageSaving(false));
                  }}
                >
                  <option value="en">English</option>
                  <option value="zh-CN">简体中文</option>
                </select>
              </label>
              {languageError && (
                <p className="text-xs text-destructive sm:col-span-2" role="alert">
                  {t('界面语言未能保存。')}
                </p>
              )}
            </section>
            {tabs.supported && (
              <section className="space-y-3 border-t pt-4" data-hd-tab-settings>
                <h3 className="text-sm font-semibold">{t('Project tabs')}</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={tabs.layout?.orientation === 'horizontal' ? 'secondary' : 'outline'}
                    aria-pressed={tabs.layout?.orientation === 'horizontal'}
                    disabled={!tabs.layout || tabs.saving}
                    onClick={() => void tabs.change({ orientation: 'horizontal' })}
                  >
                    <PanelTop />
                    {t('Across the top')}
                  </Button>
                  <Button
                    variant={tabs.layout?.orientation === 'vertical' ? 'secondary' : 'outline'}
                    aria-pressed={tabs.layout?.orientation === 'vertical'}
                    disabled={!tabs.layout || tabs.saving}
                    onClick={() => void tabs.change({ orientation: 'vertical' })}
                  >
                    <PanelLeft />
                    {t('Down the left')}
                  </Button>
                </div>
                {!tabs.layout && !tabs.error && (
                  <p className="text-xs text-muted-foreground" role="status">
                    {t('Loading tab preferences…')}
                  </p>
                )}
                {tabs.layout?.orientation === 'vertical' && (
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span>{t('Collapse vertical tabs')}</span>
                    <input
                      type="checkbox"
                      checked={tabs.layout.collapsed}
                      disabled={tabs.saving}
                      onChange={(event) => void tabs.change({ collapsed: event.target.checked })}
                    />
                  </label>
                )}
                {tabs.error && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-destructive" role="alert">
                      {t(tabs.error)}
                    </p>
                    <Button variant="outline" size="sm" onClick={tabs.retry}>
                      {t('Retry')}
                    </Button>
                  </div>
                )}
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('Drag tabs to reorder. The layout applies to all open Projects.')}
                </p>
              </section>
            )}
            <section className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">{t('Panels')}</h3>
              {[
                { label: 'Project navigation', checked: navigation, change: onNavigation },
                { label: 'Inspector', checked: inspector, change: onInspector },
                { label: 'Speaker notes', checked: notes, change: onNotes },
              ].map(({ label, checked, change }) => (
                <label key={label} className="flex items-center justify-between gap-3 text-sm">
                  <span>{t(label)}</span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => change(event.target.checked)}
                  />
                </label>
              ))}
              <label className="grid items-center gap-2 text-sm sm:grid-cols-2">
                <span>{t('Notes dock')}</span>
                <select
                  className={selectClass}
                  aria-label={t('Notes dock')}
                  value={notesDock}
                  onChange={(event) =>
                    onNotesDock(event.target.value === 'right' ? 'right' : 'bottom')
                  }
                >
                  <option value="bottom">{t('Below the canvas')}</option>
                  <option value="right">{t('On the right')}</option>
                </select>
              </label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('Notes share the right dock with the Inspector.')}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={onReset}>
                  <RotateCcw />
                  {t('Reset workspace layout')}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {t('Reset panel sizes, visibility and Notes dock.')}
                </span>
              </div>
            </section>
          </TabsContent>
          <TabsContent
            value="editing"
            keepMounted
            className="min-h-0 space-y-5 overflow-y-auto pr-1"
          >
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">{t('Editing')}</h3>
              <SnappingToggle {...snapping} />
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t('Hold Alt to temporarily bypass snapping.')}
              </p>
            </section>
            <section className="space-y-3 border-t pt-4">
              <h3 className="text-sm font-semibold">{t('Keyboard shortcuts')}</h3>
              <Button variant="outline" size="sm" onClick={onKeyboard}>
                <Keyboard />
                {t('Keyboard shortcuts')}
                <kbd className="ml-2 text-xs text-muted-foreground">F1</kbd>
              </Button>
            </section>
          </TabsContent>
          <TabsContent value="fonts" keepMounted className="min-h-0 overflow-y-auto pr-1">
            <FontLibrary />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
