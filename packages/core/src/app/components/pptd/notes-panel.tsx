import { PanelBottom, PanelRight, SlidersHorizontal, X } from 'lucide-react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { PanelResizeHandle } from './panel-resize-handle';

export interface NotesEditorProps {
  value: string;
  disabled: boolean;
  presentation: boolean;
  onChange: (value: string) => void;
  onComposition: (value: boolean) => void;
  onEditOccurrence: () => void;
}

export function NotesEditor({
  value,
  disabled,
  presentation,
  onChange,
  onComposition,
  onEditOccurrence,
}: NotesEditorProps) {
  const { t } = useHuandengLocale();
  return (
    <>
      {presentation && (
        <div className="flex shrink-0 items-center gap-2 border-b px-3 py-2 text-[11px] text-muted-foreground">
          <span className="flex-1">{t('Notes for this Presentation occurrence.')}</span>
          <Button size="xs" variant="outline" onClick={onEditOccurrence} disabled={disabled}>
            {t('Edit notes')}
          </Button>
        </div>
      )}
      <Textarea
        aria-label={t('演讲备注')}
        placeholder={t('这页要讲什么？')}
        data-hd-notes-editor
        className="hd-notes-text min-h-0 flex-1 resize-none rounded-none border-none bg-transparent px-3 py-2 text-xs shadow-none focus-visible:ring-inset"
        value={value}
        readOnly={disabled || presentation}
        onChange={(event) => onChange(event.target.value)}
        onCompositionStart={() => onComposition(true)}
        onCompositionEnd={() => onComposition(false)}
      />
    </>
  );
}

export function NotesPanel({
  value,
  dock,
  height,
  width,
  disabled,
  presentation,
  onChange,
  onComposition,
  onDock,
  onHeight,
  onWidth,
  onResizeEnd,
  onClose,
  onEditOccurrence,
}: {
  value: string;
  dock: 'bottom' | 'right';
  height: number;
  width: number;
  disabled: boolean;
  presentation: boolean;
  onChange: (value: string) => void;
  onComposition: (value: boolean) => void;
  onDock: (dock: 'bottom' | 'right') => void;
  onHeight: (value: number) => void;
  onWidth: (value: number) => void;
  onResizeEnd: () => void;
  onClose: () => void;
  onEditOccurrence: () => void;
}) {
  const { t } = useHuandengLocale();
  const right = dock === 'right';
  return (
    <section
      className={`hd-notes-panel ${right ? 'hd-notes-right' : 'hd-notes-bottom'}`}
      style={right ? { width } : { height }}
      data-hd-notes-dock={dock}
      data-hd-focus-region="notes"
      tabIndex={-1}
      aria-label={t('Speaker notes')}
    >
      <PanelResizeHandle
        label={right ? 'Resize Notes width' : 'Resize Notes height'}
        value={right ? width : height}
        min={right ? 240 : 96}
        max={right ? 520 : 400}
        axis={right ? 'x' : 'y'}
        direction={-1}
        onChange={right ? onWidth : onHeight}
        onCommit={onResizeEnd}
      />
      <div className="hd-notes-content">
        <div className="flex h-9 shrink-0 items-center gap-1 border-b px-3">
          <h2 className="min-w-0 flex-1 truncate text-xs font-semibold">{t('Speaker notes')}</h2>
          <Button
            variant="ghost"
            size="icon-xs"
            title={t(right ? 'Dock Notes below' : 'Dock Notes on right')}
            aria-label={t(right ? 'Dock Notes below' : 'Dock Notes on right')}
            onClick={() => onDock(right ? 'bottom' : 'right')}
          >
            {right ? <PanelBottom /> : <PanelRight />}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            title={t(right ? 'Show Properties' : 'Hide Notes')}
            aria-label={t(right ? 'Show Properties' : 'Hide Notes')}
            onClick={onClose}
          >
            {right ? <SlidersHorizontal /> : <X />}
          </Button>
        </div>
        <NotesEditor
          value={value}
          disabled={disabled}
          presentation={presentation}
          onChange={onChange}
          onComposition={onComposition}
          onEditOccurrence={onEditOccurrence}
        />
      </div>
    </section>
  );
}
