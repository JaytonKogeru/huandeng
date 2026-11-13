import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Bold,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Group,
  Italic,
  Palette,
  Scissors,
  Settings2,
  Trash2,
  Underline,
  Ungroup,
} from 'lucide-react';
import { useRef } from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import { IS_APPLE } from '@/lib/keys';
import type { EditorKeyboardCommand } from '@/lib/pptd-keyboard';
import { effectiveTextContent } from '@/lib/pptd-object-actions';
import type { PptdElement } from '../../../pptd/types';
import {
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '../ui/context-menu';
import { type PptdTheme, resolveColor } from './renderer';

const colors = [
  ['Black', '#111827'],
  ['White', '#ffffff'],
  ['Gray', '#64748b'],
  ['Blue', '#2563eb'],
  ['Teal', '#0f766e'],
  ['Red', '#dc2626'],
  ['Orange', '#ea580c'],
  ['Purple', '#7c3aed'],
] as const;

export function ObjectContextMenuContent({
  selected,
  theme,
  disabled,
  onCommand,
  focusTarget,
}: {
  selected: PptdElement[];
  theme: PptdTheme;
  disabled: boolean;
  onCommand?: (command: EditorKeyboardCommand) => void;
  focusTarget: () => HTMLElement | null;
}) {
  const { t } = useHuandengLocale();
  const colorInput = useRef<HTMLInputElement>(null);
  const lastCommand = useRef<EditorKeyboardCommand | null>(null);
  const text = selected.filter((item) => item.elementType === 'text');
  const color = text[0]
    ? resolveColor(effectiveTextContent(text[0], theme).color, theme)
    : '#111827';
  const editable = !disabled && !!onCommand;
  const run = (command: EditorKeyboardCommand) => {
    lastCommand.current = command;
    onCommand?.(command);
  };
  const shortcut = (keys: string) => (
    <ContextMenuShortcut>{IS_APPLE ? keys.replaceAll('Ctrl', '⌘') : keys}</ContextMenuShortcut>
  );
  return (
    <>
      <input
        ref={colorInput}
        type="color"
        className="sr-only"
        tabIndex={-1}
        aria-label={t('Choose text color')}
        value={/^#[\da-f]{6}$/i.test(color) ? color : '#111827'}
        onChange={(event) => run({ type: 'text-color', color: event.target.value })}
      />
      <ContextMenuContent
        className="min-w-60"
        aria-label={t('Object menu')}
        data-hd-object-menu
        finalFocus={() => {
          const command = lastCommand.current;
          lastCommand.current = null;
          return command?.type === 'show-properties' ? false : focusTarget();
        }}
      >
        {text.length > 0 && text.length === selected.length && (
          <>
            <ContextMenuGroup>
              <ContextMenuLabel>{t('Text formatting')}</ContextMenuLabel>
              {(
                [
                  ['bold', 'Bold', 'Ctrl+B', Bold],
                  ['italic', 'Italic', 'Ctrl+I', Italic],
                  ['underline', 'Underline', 'Ctrl+U', Underline],
                ] as const
              ).map(([format, label, keys, Icon]) => (
                <ContextMenuCheckboxItem
                  key={format}
                  checked={text.every((item) => effectiveTextContent(item, theme)[format] === true)}
                  disabled={!editable}
                  onCheckedChange={() => run({ type: 'format-text', format })}
                >
                  <Icon className="size-3.5" />
                  {t(label)}
                  {shortcut(keys)}
                </ContextMenuCheckboxItem>
              ))}
              <ContextMenuItem
                disabled={!editable}
                onClick={() => run({ type: 'font-size', delta: 1 })}
              >
                {t('Increase font size')}
                {shortcut('Ctrl+Shift+>')}
              </ContextMenuItem>
              <ContextMenuItem
                disabled={!editable}
                onClick={() => run({ type: 'font-size', delta: -1 })}
              >
                {t('Decrease font size')}
                {shortcut('Ctrl+Shift+<')}
              </ContextMenuItem>
              <ContextMenuSub>
                <ContextMenuSubTrigger disabled={!editable}>
                  <Palette className="size-3.5" />
                  {t('Text color')}
                </ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  {colors.map(([name, value]) => (
                    <ContextMenuItem
                      key={value}
                      onClick={() => run({ type: 'text-color', color: value })}
                    >
                      <span
                        className="size-3 rounded-sm border border-border"
                        style={{ backgroundColor: value }}
                      />
                      {t(name)}
                    </ContextMenuItem>
                  ))}
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => colorInput.current?.click()}>
                    {t('More colors…')}
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuGroup>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem
          disabled={!onCommand || !selected.length}
          onClick={() => run({ type: 'copy' })}
        >
          <Copy />
          {t('Copy')}
          {shortcut('Ctrl+C')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!onCommand || !selected.length}
          onClick={() => run({ type: 'copy-json' })}
        >
          <Copy />
          {t('复制对象 JSON')}
          {shortcut('Ctrl+Alt+C')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!editable || !selected.length}
          onClick={() => run({ type: 'cut' })}
        >
          <Scissors />
          {t('Cut')}
          {shortcut('Ctrl+X')}
        </ContextMenuItem>
        <ContextMenuItem disabled={!editable} onClick={() => run({ type: 'paste' })}>
          <ClipboardPaste />
          {t('Paste')}
          {shortcut('Ctrl+V')}
        </ContextMenuItem>
        <ContextMenuItem
          disabled={!editable || !selected.length}
          onClick={() => run({ type: 'duplicate' })}
        >
          <CopyPlus />
          {t('Duplicate')}
          {shortcut('Ctrl+D')}
        </ContextMenuItem>
        {selected.length > 0 && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger disabled={!editable}>
                <ArrowUp className="size-3.5" />
                {t('Arrange')}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {(
                  [
                    ['forward', 'Bring forward', 'Ctrl+]', ArrowUp],
                    ['backward', 'Send backward', 'Ctrl+[', ArrowDown],
                    ['front', 'Bring to front', 'Ctrl+Shift+]', ArrowUpToLine],
                    ['back', 'Send to back', 'Ctrl+Shift+[', ArrowDownToLine],
                  ] as const
                ).map(([direction, label, keys, Icon]) => (
                  <ContextMenuItem
                    key={direction}
                    onClick={() => run({ type: 'layer', direction })}
                  >
                    <Icon />
                    {t(label)}
                    {shortcut(keys)}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
            <ContextMenuItem
              disabled={!editable || selected.length < 2}
              onClick={() => run({ type: 'group', ungroup: false })}
            >
              <Group />
              {t('Group')}
              {shortcut('Ctrl+G')}
            </ContextMenuItem>
            <ContextMenuItem
              disabled={!editable || !selected.some((item) => item.elementType === 'group')}
              onClick={() => run({ type: 'group', ungroup: true })}
            >
              <Ungroup />
              {t('Ungroup')}
              {shortcut('Ctrl+Shift+G')}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem disabled={!onCommand} onClick={() => run({ type: 'show-properties' })}>
              <Settings2 />
              {t('Properties…')}
            </ContextMenuItem>
            <ContextMenuItem
              variant="destructive"
              disabled={!editable}
              onClick={() => run({ type: 'remove-elements' })}
            >
              <Trash2 />
              {t('Delete')}
              {shortcut('Delete')}
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </>
  );
}
