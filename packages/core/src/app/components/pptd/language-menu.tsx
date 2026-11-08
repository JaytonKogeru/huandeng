import { Languages } from 'lucide-react';
import { toast } from 'sonner';
import { IconTooltip, MenuTooltipTrigger } from '@/components/icon-tooltip';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import { cn } from '@/lib/utils';

export function HuandengLanguageMenu() {
  const { locale, t, setLocale } = useHuandengLocale();
  return (
    <DropdownMenu>
      <IconTooltip label={t('界面语言')}>
        <DropdownMenuTrigger
          render={
            <MenuTooltipTrigger
              type="button"
              aria-label={t('界面语言')}
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon-sm' }))}
            />
          }
        >
          <Languages className="size-3.5" />
        </DropdownMenuTrigger>
      </IconTooltip>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(value) => {
            if (value !== 'en' && value !== 'zh-CN') return;
            void setLocale(value).catch((error) =>
              toast.error(t('界面语言未能保存。'), {
                description: t(error instanceof Error ? error.message : String(error)),
              }),
            );
          }}
        >
          <DropdownMenuRadioItem value="en">English</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="zh-CN">简体中文</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
