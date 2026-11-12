import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Fingerprint,
  FolderOpen,
  History,
  ListTree,
  type LucideIcon,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react';
import { type ReactElement, type ReactNode, useRef, useState } from 'react';
import { useHuandengLocale } from '@/lib/huandeng-locale';
import { projectSlideTitle } from '@/lib/pptd-project-source';
import type { PageSnapshot } from '../../../pptd/types';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export type SlideAction =
  | 'open'
  | 'present'
  | 'story'
  | 'notes'
  | 'history'
  | 'show-file'
  | 'go-main'
  | 'arrange'
  | 'insert-before'
  | 'insert-after'
  | 'duplicate'
  | 'toggle-hidden'
  | 'remove';

type MenuAction = SlideAction | 'copy-code' | 'move-up' | 'move-down';

export function SlideActionsMenu({
  page,
  presentation,
  disabled,
  readOnly,
  canMoveUp,
  canMoveDown,
  onAction,
  onEdit,
  onHistory,
  onMove,
  children,
}: {
  page: PageSnapshot;
  presentation: boolean;
  disabled: boolean;
  readOnly: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onAction?: (page: PageSnapshot, action: SlideAction) => void;
  onEdit: (pageId: string, occurrenceId?: string) => void;
  onHistory?: (pageId: string, occurrenceId?: string) => void;
  onMove: (direction: -1 | 1) => void;
  children: (more: ReactNode) => ReactElement;
}) {
  const { t } = useHuandengLocale();
  const [copyStatus, setCopyStatus] = useState('');
  const contextFocus = useRef<HTMLElement | null>(null);
  const actionTakesFocus = useRef(false);
  const title = projectSlideTitle(page, t('Untitled slide'));
  const main = !presentation && !page.versionId;
  const blocked = (action: MenuAction): boolean => {
    if (action === 'copy-code') return false;
    if (disabled) return true;
    if (action === 'move-up') return !main || readOnly || !canMoveUp;
    if (action === 'move-down') return !main || readOnly || !canMoveDown;
    if (action === 'open') return false;
    if (action === 'history') return !onAction && !onHistory;
    if (!onAction) return true;
    if (action === 'present') return !!page.metadata.hidden;
    return (
      ['insert-before', 'insert-after', 'duplicate', 'toggle-hidden', 'remove'].includes(action) &&
      (!main || readOnly)
    );
  };
  const run = (action: MenuAction) => {
    if (blocked(action)) return;
    if (action === 'copy-code') {
      const code = page.shortCode ?? page.pageId;
      void navigator.clipboard.writeText(code).then(
        () => setCopyStatus(t('Copied Slide code {code}', { code })),
        () => setCopyStatus(t('Could not copy the Slide code. Try again.')),
      );
    } else if (action === 'move-up' || action === 'move-down') {
      onMove(action === 'move-up' ? -1 : 1);
    } else {
      actionTakesFocus.current = true;
      if (onAction) onAction(page, action);
      else if (action === 'open') onEdit(page.pageId, page.occurrenceId);
      else if (action === 'history') onHistory?.(page.pageId, page.occurrenceId);
    }
  };
  const content = (kind: 'context' | 'dropdown') => {
    const Item = kind === 'context' ? ContextMenuItem : DropdownMenuItem;
    const Separator = kind === 'context' ? ContextMenuSeparator : DropdownMenuSeparator;
    const Sub = kind === 'context' ? ContextMenuSub : DropdownMenuSub;
    const SubTrigger = kind === 'context' ? ContextMenuSubTrigger : DropdownMenuSubTrigger;
    const SubContent = kind === 'context' ? ContextMenuSubContent : DropdownMenuSubContent;
    const item = (action: MenuAction, label: string, Icon: LucideIcon, destructive = false) => (
      <Item
        key={action}
        data-hd-slide-action={action}
        disabled={blocked(action)}
        variant={destructive ? 'destructive' : 'default'}
        onClick={() => run(action)}
      >
        <Icon />
        {t(label)}
      </Item>
    );
    return (
      <>
        {item('open', page.versionId ? 'View pinned slide' : 'Open slide', Pencil)}
        {item('present', 'Present from this slide', Play)}
        {item('story', 'Open Story', BookOpen)}
        {item('notes', 'Open Notes', FileText)}
        {item('history', 'View page history', History)}
        <Separator />
        {item('copy-code', 'Copy Slide code', Fingerprint)}
        {item('show-file', 'Show source in Files', FolderOpen)}
        {presentation && (
          <>
            {item('go-main', 'Go to Main Slide', Pencil)}
            {item('arrange', 'Arrange this Presentation', ListTree)}
          </>
        )}
        {main && (
          <>
            <Separator />
            <Sub>
              <SubTrigger data-hd-slide-organize>
                <ListTree className="size-3.5" />
                {t('Organize Slide')}
              </SubTrigger>
              <SubContent>
                {item('insert-before', 'Insert blank slide before', Plus)}
                {item('insert-after', 'Insert blank slide after', Plus)}
                {item('duplicate', 'Duplicate Slide', Copy)}
                <Separator />
                {item('move-up', 'Move Slide up', ArrowUp)}
                {item('move-down', 'Move Slide down', ArrowDown)}
              </SubContent>
            </Sub>
            {item(
              'toggle-hidden',
              page.metadata.hidden ? 'Show slide' : 'Hide slide',
              page.metadata.hidden ? Eye : EyeOff,
            )}
            {item('remove', 'Remove from Main', Trash2, true)}
          </>
        )}
      </>
    );
  };
  const more = (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) actionTakesFocus.current = false;
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={t('More actions for {title}', { title })}
            title={t('Slide actions')}
            data-hd-slide-more={page.occurrenceId ?? page.pageId}
          >
            <MoreHorizontal />
          </Button>
        }
      />
      <DropdownMenuContent
        align="start"
        aria-label={t('Slide actions')}
        data-hd-slide-menu="dropdown"
        finalFocus={() => !actionTakesFocus.current}
      >
        {content('dropdown')}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) actionTakesFocus.current = false;
      }}
    >
      <ContextMenuTrigger
        render={children(more)}
        onContextMenu={(event) => {
          const target = event.target instanceof HTMLElement ? event.target : event.currentTarget;
          contextFocus.current =
            target.closest<HTMLElement>('button') ??
            event.currentTarget.querySelector<HTMLElement>('[data-hd-browser-select]');
        }}
        onKeyDownCapture={(event) => {
          if (
            event.nativeEvent.isComposing ||
            !(event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10'))
          )
            return;
          event.preventDefault();
          event.stopPropagation();
          const target = event.target instanceof HTMLElement ? event.target : event.currentTarget;
          const bounds = target.getBoundingClientRect();
          target.dispatchEvent(
            new MouseEvent('contextmenu', {
              bubbles: true,
              cancelable: true,
              clientX: bounds.left + Math.min(24, bounds.width / 2),
              clientY: bounds.top + Math.min(24, bounds.height / 2),
            }),
          );
        }}
      />
      <ContextMenuContent
        aria-label={t('Slide actions')}
        data-hd-slide-menu="context"
        finalFocus={() => (actionTakesFocus.current ? false : (contextFocus.current ?? false))}
      >
        {content('context')}
      </ContextMenuContent>
      <span className="sr-only" role="status">
        {copyStatus}
      </span>
    </ContextMenu>
  );
}
