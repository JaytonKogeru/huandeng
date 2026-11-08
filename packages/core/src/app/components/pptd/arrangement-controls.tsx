import { useState } from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import type { Alignment } from '@/lib/inspector/geometry';
import type { AlignmentReference } from '@/lib/pptd-geometry';
import { Button } from '../ui/button';

export function ArrangementControls({
  selectedCount,
  disabled,
  onAlign,
  onDistribute,
}: {
  selectedCount: number;
  disabled: boolean;
  onAlign: (alignment: Alignment, reference: AlignmentReference) => void;
  onDistribute: (axis: 'x' | 'y') => void;
}) {
  const { t } = useHuandengLocale();
  const [reference, setReference] = useState<AlignmentReference>('selection');
  const activeReference = selectedCount < 2 ? 'slide' : reference;
  return (
    <div className="space-y-2" data-hd-arrangement>
      <label className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{t('对齐参照')}</span>
        <select
          value={activeReference}
          disabled={disabled || selectedCount < 2}
          className="h-8 min-w-0 rounded border border-input bg-background px-2 text-xs text-foreground"
          data-hd-alignment-reference
          onChange={(event) => setReference(event.target.value as AlignmentReference)}
        >
          <option value="selection">{t('所选对象')}</option>
          <option value="slide">{t('幻灯片')}</option>
        </select>
      </label>
      <div className="grid grid-cols-3 gap-1">
        {(
          [
            ['left', '左对齐'],
            ['center', '水平居中'],
            ['right', '右对齐'],
            ['top', '顶部对齐'],
            ['middle', '垂直居中'],
            ['bottom', '底部对齐'],
          ] as const
        ).map(([alignment, label]) => (
          <Button
            key={alignment}
            variant="outline"
            size="xs"
            disabled={disabled || !selectedCount}
            data-hd-align={alignment}
            onClick={() => onAlign(alignment, activeReference)}
          >
            {t(label)}
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1">
        {(
          [
            ['x', '水平分布'],
            ['y', '垂直分布'],
          ] as const
        ).map(([axis, label]) => (
          <Button
            key={axis}
            variant="outline"
            size="xs"
            disabled={disabled || selectedCount < 3}
            data-hd-distribute={axis}
            title={
              selectedCount < 3
                ? t('选择至少三个对象，均匀分配间距')
                : t('保持两端对象，均匀分配间距')
            }
            onClick={() => onDistribute(axis)}
          >
            {t(label)}
          </Button>
        ))}
      </div>
    </div>
  );
}
