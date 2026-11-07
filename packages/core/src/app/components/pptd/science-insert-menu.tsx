import { ChartNoAxesCombined, Grid2X2, Sigma, Smile } from 'lucide-react';
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
  const insert = (kind: ScienceObject, variant?: string) =>
    onInsert(createScienceElement(kind, `node-${crypto.randomUUID()}`, size, variant));
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button size="sm" variant="ghost" disabled={disabled} aria-label="插入科研对象" />}
      >
        <ChartNoAxesCombined />
        科研对象
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => insert('table')}>
          <Grid2X2 />
          表格
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => insert('equation')}>
          <Sigma />
          LaTeX 公式
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => insert('icon')}>
          <Smile />
          图标
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {CHART_TYPES.map((type) => (
          <DropdownMenuItem key={type} onClick={() => insert('chart', type)}>
            <ChartNoAxesCombined />
            {CHART_LABELS[type]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
