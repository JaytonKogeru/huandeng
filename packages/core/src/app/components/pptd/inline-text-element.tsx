import {
  Bold,
  Highlighter,
  Italic,
  Palette,
  Subscript,
  Superscript,
  Underline,
} from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import type { PptdElement } from '../../../pptd/types';
import { Button } from '../ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '../ui/context-menu';
import {
  isRichText,
  type PptdTheme,
  sanitizeRichTextHtml,
  textContent,
  textCss,
  textValue,
} from './renderer';

const formats = [
  ['bold', 'Bold', Bold],
  ['italic', 'Italic', Italic],
  ['underline', 'Underline', Underline],
  ['superscript', 'Superscript', Superscript],
  ['subscript', 'Subscript', Subscript],
] as const;
const colors = [
  ['Black', '#111827'],
  ['White', '#ffffff'],
  ['Gray', '#64748b'],
  ['Red', '#dc2626'],
  ['Blue', '#2563eb'],
  ['Teal', '#0f766e'],
  ['Orange', '#ea580c'],
  ['Purple', '#7c3aed'],
] as const;
const highlights = [
  ['Yellow', '#fff59d'],
  ['Green', '#c8e6c9'],
  ['Blue', '#bbdefb'],
  ['Pink', '#f8bbd0'],
] as const;

export function InlineTextElement({
  element,
  theme,
  toolbarTarget,
  onChange,
  onComposition,
  onFinish,
  selectAll = false,
}: {
  element: PptdElement;
  theme: PptdTheme;
  toolbarTarget: HTMLElement | null;
  onChange: (text: string) => void;
  onComposition: (composing: boolean) => void;
  onFinish: (restoreFocus: boolean) => void;
  selectAll?: boolean;
}) {
  const { t } = useHuandengLocale();
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const menuOpen = useRef(false);
  const content = textContent(element, theme);
  const initial = useRef(textValue(content.text));
  const selectInitial = useRef(selectAll);
  const rich = useRef(isRichText(initial.current));
  const composing = useRef(false);
  const [compositionActive, setCompositionActive] = useState(false);
  const [textColor, setTextColor] = useState('#dc2626');
  const [highlightColor, setHighlightColor] = useState('#fff59d');
  const latest = useRef({ onChange, onComposition, onFinish });
  latest.current = { onChange, onComposition, onFinish };
  const captureSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.startContainer) && editor.contains(range.endContainer))
      selectionRef.current = range.cloneRange();
  };
  const restoreSelection = () => {
    const editor = editorRef.current;
    const range = selectionRef.current;
    if (
      !editor ||
      !range ||
      !editor.contains(range.startContainer) ||
      !editor.contains(range.endContainer)
    )
      return false;
    editor.focus({ preventScroll: true });
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range.cloneRange());
    return true;
  };
  const read = () => {
    const editor = editorRef.current;
    if (!editor || composing.current) return;
    if (editor.querySelector('strong,b,em,i,u,s,sup,sub,span,a,ul,ol')) rich.current = true;
    latest.current.onChange(
      rich.current ? sanitizeRichTextHtml(editor.innerHTML) : editor.innerText,
    );
    captureSelection();
  };
  const format = (command: string, value?: string) => {
    if (composing.current || !restoreSelection()) return;
    const css = command === 'foreColor' || command === 'hiliteColor';
    const previous = css && document.queryCommandState('styleWithCSS');
    if (css) document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, value);
    if (css) document.execCommand('styleWithCSS', false, previous ? 'true' : 'false');
    rich.current = true;
    read();
  };
  const isFormattingTarget = (target: EventTarget | null) =>
    target instanceof Element && !!target.closest('[data-hd-inline-format-ui]');

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (rich.current) editor.innerHTML = sanitizeRichTextHtml(initial.current);
    else editor.textContent = initial.current;
    editor.focus({ preventScroll: true });
    const range = document.createRange();
    range.selectNodeContents(editor);
    if (!selectInitial.current) range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    selectionRef.current = range.cloneRange();
    return () => latest.current.onComposition(false);
  }, []);
  useEffect(() => {
    document.addEventListener('selectionchange', captureSelection);
    const focus = (event: FocusEvent) => {
      if (
        composing.current ||
        menuOpen.current ||
        isFormattingTarget(event.target) ||
        editorRef.current?.contains(event.target as Node)
      )
        return;
      read();
      latest.current.onFinish(false);
    };
    document.addEventListener('focusin', focus);
    return () => {
      document.removeEventListener('selectionchange', captureSelection);
      document.removeEventListener('focusin', focus);
    };
  });

  const colorItems = (kind: 'text' | 'highlight') => (
    <>
      {(kind === 'text' ? colors : highlights).map(([label, color]) => (
        <ContextMenuItem
          key={color}
          disabled={compositionActive}
          onClick={() => format(kind === 'text' ? 'foreColor' : 'hiliteColor', color)}
        >
          <span
            className="size-3 rounded-sm border border-border"
            style={{ backgroundColor: color }}
          />
          {t(label)}
        </ContextMenuItem>
      ))}
      {kind === 'highlight' && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            disabled={compositionActive}
            onClick={() => format('hiliteColor', 'transparent')}
          >
            {t('No highlight')}
          </ContextMenuItem>
        </>
      )}
    </>
  );
  const toolbar = (
    <div
      data-hd-inline-format-ui
      data-hd-inline-toolbar
      className="absolute left-1/2 top-2 z-40 flex -translate-x-1/2 items-center gap-0.5 rounded-md border bg-popover p-1 shadow-floating"
      onPointerDown={(event) => {
        event.stopPropagation();
        captureSelection();
        if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
      }}
    >
      {formats.map(([command, label, Icon]) => (
        <Button
          key={command}
          variant="ghost"
          size="icon-sm"
          disabled={compositionActive}
          aria-label={t(label)}
          title={t(label)}
          onClick={() => format(command)}
        >
          <Icon className="size-3.5" />
        </Button>
      ))}
      <span className="mx-1 h-5 w-px bg-border" />
      <label
        className="relative flex size-7 cursor-pointer items-center justify-center rounded hover:bg-muted"
        title={t('Text color')}
      >
        <Palette className="size-3.5" style={{ color: textColor }} />
        <input
          type="color"
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label={t('Selected text color')}
          value={textColor}
          disabled={compositionActive}
          onChange={(event) => {
            setTextColor(event.target.value);
            format('foreColor', event.target.value);
          }}
        />
      </label>
      <label
        className="relative flex size-7 cursor-pointer items-center justify-center rounded hover:bg-muted"
        title={t('Highlight')}
      >
        <Highlighter className="size-3.5" style={{ backgroundColor: highlightColor }} />
        <input
          type="color"
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label={t('Selected text highlight')}
          value={highlightColor}
          disabled={compositionActive}
          onChange={(event) => {
            setHighlightColor(event.target.value);
            format('hiliteColor', event.target.value);
          }}
        />
      </label>
    </div>
  );
  const align = Array.isArray(content.align) ? content.align : ['left', 'top'];
  return (
    <>
      {toolbarTarget && createPortal(toolbar, toolbarTarget)}
      <ContextMenu
        onOpenChange={(open) => {
          menuOpen.current = open;
          if (open) captureSelection();
        }}
      >
        <ContextMenuTrigger className="contents">
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems:
                align[1] === 'middle'
                  ? 'center'
                  : align[1] === 'bottom'
                    ? 'flex-end'
                    : 'flex-start',
              cursor: 'text',
            }}
          >
            {/* biome-ignore lint/a11y/useSemanticElements: A textarea cannot preserve editable rich text spans. */}
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-label={t('编辑文本')}
              aria-multiline
              tabIndex={0}
              spellCheck={false}
              data-hd-inline-editor
              className="[&_p]:m-0 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-6 [&_ol]:pl-6"
              style={{
                ...textCss(content, theme),
                outline: 'none',
                minHeight: '1em',
                userSelect: 'text',
                cursor: 'text',
              }}
              onInput={read}
              onPointerDown={(event) => event.stopPropagation()}
              onContextMenuCapture={captureSelection}
              onCompositionStart={() => {
                composing.current = true;
                setCompositionActive(true);
                onComposition(true);
              }}
              onCompositionEnd={() => {
                composing.current = false;
                setCompositionActive(false);
                read();
                onComposition(false);
              }}
              onBlur={(event) => {
                if (
                  composing.current ||
                  menuOpen.current ||
                  isFormattingTarget(event.relatedTarget)
                )
                  return;
                requestAnimationFrame(() => {
                  if (
                    !editorRef.current ||
                    menuOpen.current ||
                    isFormattingTarget(document.activeElement) ||
                    editorRef.current.contains(document.activeElement) ||
                    !document.hasFocus()
                  )
                    return;
                  read();
                  latest.current.onFinish(false);
                });
              }}
              onPaste={(event) => {
                event.preventDefault();
                document.execCommand(
                  'insertText',
                  false,
                  event.clipboardData.getData('text/plain'),
                );
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                if (
                  event.key === 'Escape' ||
                  ((event.ctrlKey || event.metaKey) &&
                    (event.key === 'Enter' || event.key.toLowerCase() === 's'))
                ) {
                  event.preventDefault();
                  read();
                  onFinish(true);
                }
              }}
            />
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent
          data-hd-inline-format-ui
          data-hd-inline-menu
          aria-label={t('Selected text formatting')}
          onPointerDown={(event) => event.stopPropagation()}
          finalFocus={() => {
            requestAnimationFrame(restoreSelection);
            return editorRef.current;
          }}
        >
          {formats.map(([command, label, Icon]) => (
            <ContextMenuItem
              key={command}
              disabled={compositionActive}
              onClick={() => format(command)}
            >
              <Icon className="size-3.5" />
              {t(label)}
            </ContextMenuItem>
          ))}
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={compositionActive}>
              <Palette className="size-3.5" />
              {t('Text color')}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent
              data-hd-inline-format-ui
              onPointerDown={(event) => event.stopPropagation()}
            >
              {colorItems('text')}
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSub>
            <ContextMenuSubTrigger disabled={compositionActive}>
              <Highlighter className="size-3.5" />
              {t('Highlight')}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent
              data-hd-inline-format-ui
              onPointerDown={(event) => event.stopPropagation()}
            >
              {colorItems('highlight')}
            </ContextMenuSubContent>
          </ContextMenuSub>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}
