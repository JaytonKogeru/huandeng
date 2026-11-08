import { uiText as t, useHuandengLocale } from '@/lib/huandeng-locale';
import { IS_APPLE } from '@/lib/keys';
import { EDITOR_KEYBOARD_HELP } from '@/lib/pptd-keyboard';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

export function KeyboardHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useHuandengLocale();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('键盘操作')}</DialogTitle>
          <DialogDescription>
            {t('按键作用于当前区域。输入文字、表格和属性时，保留输入框自己的操作。F6 可切换面板。')}
          </DialogDescription>
        </DialogHeader>
        {EDITOR_KEYBOARD_HELP.map((group) => (
          <section key={group.title} className="space-y-2">
            <h3 className="text-sm font-semibold">{t(group.title)}</h3>
            <dl className="divide-y divide-border rounded-md border px-3">
              {group.items.map(([keys, description]) => (
                <div
                  key={keys}
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 py-2"
                >
                  <dt className="font-mono text-xs text-foreground">
                    {IS_APPLE ? t(keys).replaceAll('Ctrl', '⌘') : t(keys)}
                  </dt>
                  <dd className="text-xs leading-relaxed text-muted-foreground">
                    {t(description)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t('返回编辑器')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
