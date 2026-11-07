import { ChevronDown, Shapes } from 'lucide-react';
import type { InsertionTool } from '@/lib/pptd-insertion';
import { presetShapePath, SHAPE_PRESETS } from '../../../pptd/shape-presets';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export function ShapeInsertMenu({
  disabled,
  active,
  onChoose,
}: {
  disabled: boolean;
  active: boolean;
  onChoose: (tool: InsertionTool) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            size="sm"
            variant={active ? 'secondary' : 'ghost'}
            disabled={disabled}
            aria-label="选择形状"
            aria-pressed={active}
          />
        }
      >
        <Shapes />
        形状
        <ChevronDown className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="grid w-72 grid-cols-3 gap-1 p-2"
        aria-label="形状种类"
      >
        {SHAPE_PRESETS.map(([name, label]) => {
          const path = presetShapePath(name, 28, 24);
          return (
            <DropdownMenuItem
              key={name}
              onClick={() => onChoose({ kind: 'shape', shapeName: name })}
              className="flex-col justify-center gap-1.5 py-2.5 text-[11px]"
              aria-label={label}
            >
              <svg
                width="28"
                height="24"
                viewBox="0 0 28 24"
                aria-hidden="true"
                className="size-7 fill-brand/10 stroke-current"
                strokeWidth="1.25"
              >
                {path ? (
                  <path d={path} />
                ) : name === 'ellipse' ? (
                  <ellipse cx="14" cy="12" rx="13" ry="11" />
                ) : (
                  <rect x="1" y="1" width="26" height="22" rx={name === 'roundRect' ? 5 : 0} />
                )}
              </svg>
              {label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
