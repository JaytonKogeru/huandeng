import { ChartNoAxesCombined, Grid2X2, Sigma, Smile } from 'lucide-react';
import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import {
  CHART_LABELS,
  CHART_TYPES,
  createScienceElement,
  type ScienceObject,
} from '../../../pptd/science-model';
import type { PageSize, PptdElement } from '../../../pptd/types';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function ScienceInsertMenu({
  size,
  disabled,
  onInsert,
}: {
  size: PageSize;
  disabled?: boolean;
  onInsert: (element: PptdElement) => void;
}) {
  useHuandengLocale();
  const insert = (kind: ScienceObject, variant?: string) =>
    onInsert(createScienceElement(kind, `node-${crypto.randomUUID()}`, size, variant));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="sm" variant="ghost" disabled={disabled} aria-label={t('插入数据')} />}
      >
        <ChartNoAxesCombined />
        {t('数据')}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => insert('table')}>
          <Grid2X2 />
          {t('表格')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => insert('equation')}>
          <Sigma />
          {t('LaTeX 公式')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => insert('icon')}>
          <Smile />
          {t('图标')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ChartNoAxesCombined />
            {t('图表')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {CHART_TYPES.map((type) => (
              <DropdownMenuItem key={type} onClick={() => insert('chart', type)}>
                <ChartNoAxesCombined />
                {t(CHART_LABELS[type])}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
