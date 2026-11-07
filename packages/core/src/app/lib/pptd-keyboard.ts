import { groupChildren } from '../../pptd/grouping';
import type { PptdElement } from '../../pptd/types';

export type EditorKeyboardScope =
  | 'canvas'
  | 'layers'
  | 'thumbnails'
  | 'input'
  | 'control'
  | 'dialog'
  | 'timeline'
  | 'workspace';

export type EditorKeyboardCommand =
  | { type: 'help' | 'save' | 'cancel' | 'undo' | 'redo' | 'copy' | 'cut' | 'select-all' }
  | { type: 'remove-elements' | 'remove-page' | 'duplicate' | 'add-page' }
  | { type: 'group'; ungroup: boolean }
  | { type: 'tool'; key: 'v' | 't' | 'r' | 'l' }
  | { type: 'nudge'; dx: number; dy: number }
  | { type: 'focus-region' | 'page-step'; direction: -1 | 1 }
  | { type: 'page-boundary'; end: boolean }
  | { type: 'present'; fromCurrent: boolean };

type KeyboardInput = Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'> & {
  defaultPrevented?: boolean;
  isComposing?: boolean;
  keyCode?: number;
};

export function editorKeyboardScope(target: EventTarget | null): EditorKeyboardScope {
  if (!(target instanceof Element)) return 'workspace';
  if (target.closest('[role="dialog"], [role="alertdialog"], [role="menu"]')) return 'dialog';
  if (
    target.closest(
      'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"], [role="combobox"], [role="listbox"], [role="spinbutton"], [role="slider"]',
    )
  )
    return 'input';
  if (target.closest('[data-hd-keyboard-region="timeline"]')) return 'timeline';
  if (target.closest('[data-hd-thumbnail]')) return 'thumbnails';
  if (target.closest('[data-hd-layer]')) return 'layers';
  if (target.closest('button, a, summary, [role="tab"], [role="menuitem"]')) return 'control';
  if (target.closest('[data-hd-editor-canvas]')) return 'canvas';
  return 'workspace';
}

export function resolveEditorKeyboardCommand(
  event: KeyboardInput,
  scope: EditorKeyboardScope,
  presenting = false,
): EditorKeyboardCommand | null {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.keyCode === 229 ||
    event.altKey ||
    scope === 'dialog'
  )
    return null;
  const control = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();
  if (!control && key === 'f6') return { type: 'focus-region', direction: event.shiftKey ? -1 : 1 };
  if (!control && key === 'f1') return { type: 'help' };
  if (control && key === 's') return { type: 'save' };
  if (presenting && !control && key === 'escape') return { type: 'cancel' };
  if (scope === 'input') return null;
  if (scope === 'timeline')
    return !presenting && control && (key === 'z' || key === 'y')
      ? { type: key === 'y' || event.shiftKey ? 'redo' : 'undo' }
      : null;
  if (!control && key === 'escape') return { type: 'cancel' };
  if (!control && key === 'f5') return { type: 'present', fromCurrent: event.shiftKey };
  if (presenting) {
    if (control || (scope === 'control' && key === ' ')) return null;
    if (['arrowright', 'arrowdown', ' ', 'pagedown'].includes(key))
      return { type: 'page-step', direction: 1 };
    if (['arrowleft', 'arrowup', 'pageup'].includes(key))
      return { type: 'page-step', direction: -1 };
    if (key === 'home' || key === 'end') return { type: 'page-boundary', end: key === 'end' };
    return null;
  }
  if (!control && (key === 'pageup' || key === 'pagedown'))
    return { type: 'page-step', direction: key === 'pageup' ? -1 : 1 };
  if (control && (key === 'z' || key === 'y'))
    return { type: key === 'y' || event.shiftKey ? 'redo' : 'undo' };
  if (control && key === 'm') return { type: 'add-page' };
  if (scope === 'control') return null;
  if (control && key === 'd') return { type: 'duplicate' };
  if (scope === 'thumbnails')
    return !control && (key === 'delete' || key === 'backspace') ? { type: 'remove-page' } : null;
  if (control && key === 'a') return { type: 'select-all' };
  if (control && (key === 'c' || key === 'x')) return { type: key === 'c' ? 'copy' : 'cut' };
  if (control && key === 'g') return { type: 'group', ungroup: event.shiftKey };
  if (!control && (key === 'delete' || key === 'backspace')) return { type: 'remove-elements' };
  if (scope === 'layers' || control) return null;
  if (['v', 't', 'r', 'l'].includes(key))
    return { type: 'tool', key: key as 'v' | 't' | 'r' | 'l' };
  const step = event.shiftKey ? 10 : 1;
  if (key === 'arrowleft' || key === 'arrowright')
    return { type: 'nudge', dx: key === 'arrowleft' ? -step : step, dy: 0 };
  if (key === 'arrowup' || key === 'arrowdown')
    return { type: 'nudge', dx: 0, dy: key === 'arrowup' ? -step : step };
  return null;
}

export function topLevelElementIds(elements: PptdElement[]): string[] {
  const children = new Set(elements.flatMap(groupChildren));
  return elements
    .filter((element) => !children.has(element.elementId))
    .map((item) => item.elementId);
}

export function selectionRootIds(elements: PptdElement[], selectedIds: string[]): string[] {
  const selected = new Set(selectedIds);
  const children = new Map(elements.map((element) => [element.elementId, groupChildren(element)]));
  const covered = new Set<string>();
  const visit = (id: string) => {
    for (const child of children.get(id) ?? []) {
      if (covered.has(child)) continue;
      covered.add(child);
      visit(child);
    }
  };
  for (const id of selected) visit(id);
  return elements
    .filter((element) => selected.has(element.elementId) && !covered.has(element.elementId))
    .map((element) => element.elementId);
}

export function selectionRemovalIds(elements: PptdElement[], selectedIds: string[]): string[] {
  const byId = new Map(elements.map((element) => [element.elementId, element]));
  const ordered = new Set<string>();
  const visit = (id: string) => {
    const element = byId.get(id);
    if (!element || ordered.has(id)) return;
    ordered.add(id);
    for (const child of groupChildren(element)) visit(child);
  };
  for (const id of selectionRootIds(elements, selectedIds)) visit(id);
  return [...ordered];
}

export function cycleItemId(
  ids: string[],
  current: string | undefined,
  direction: -1 | 1,
  wrap = true,
): string | null {
  if (!ids.length) return null;
  const index = current ? ids.indexOf(current) : -1;
  if (index < 0) return direction === 1 ? ids[0] : ids[ids.length - 1];
  const next = index + direction;
  return ids[wrap ? (next + ids.length) % ids.length : Math.max(0, Math.min(ids.length - 1, next))];
}

export function focusEditorCanvas(elementId?: string): boolean {
  const canvas = document.querySelector<HTMLElement>('[data-hd-editor-canvas]');
  const element = elementId
    ? canvas?.querySelector<HTMLElement>(`[data-hd-element-id="${CSS.escape(elementId)}"]`)
    : null;
  const target = element ?? canvas;
  target?.focus({ preventScroll: true });
  return !!target;
}

export function focusWorkspaceRegion(direction: -1 | 1): void {
  const presenter = document.querySelector<HTMLElement>('[data-hd-presenter]');
  if (presenter) {
    const controls = [
      ...presenter.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
      ),
    ].filter(
      (control) =>
        control.tabIndex >= 0 &&
        control.getClientRects().length > 0 &&
        !control.matches(':disabled'),
    );
    if (!controls.length) {
      presenter.focus({ preventScroll: true });
      return;
    }
    const index = controls.indexOf(document.activeElement as HTMLElement);
    const next = index < 0 ? (direction === 1 ? 0 : controls.length - 1) : index + direction;
    controls[(next + controls.length) % controls.length]?.focus();
    return;
  }
  const regions = [
    ...document.querySelectorAll<HTMLElement>(
      '[data-hd-focus-region], [data-hd-keyboard-region="timeline"]',
    ),
  ].filter((element) => element.getClientRects().length > 0 && !element.closest('[hidden]'));
  if (!regions.length) return;
  const index = regions.findIndex((region) => region.contains(document.activeElement));
  const next = index < 0 ? (direction === 1 ? 0 : regions.length - 1) : index + direction;
  const region = regions[(next + regions.length) % regions.length];
  if (region.hasAttribute('data-hd-editor-canvas')) {
    region.focus({ preventScroll: true });
    return;
  }
  const visible = (selector: string) =>
    [...region.querySelectorAll<HTMLElement>(selector)].find(
      (element) => element.getClientRects().length > 0,
    );
  const target =
    visible('[data-hd-thumbnail][tabindex="0"]') ??
    visible('[data-hd-element-id][tabindex="0"]') ??
    visible(
      'input:not(:disabled), textarea:not(:disabled), select:not(:disabled), button:not(:disabled):not([tabindex="-1"]), [tabindex="0"]',
    ) ??
    region;
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

export const EDITOR_KEYBOARD_HELP = [
  {
    title: '画布与对象',
    items: [
      ['Tab / Shift+Tab', '选择下一个 / 上一个顶层对象'],
      ['↑ ↓ ← → / Shift+方向键', '移动 1 / 10 个文档单位'],
      ['Enter', '编辑选中的文字'],
      ['Esc', '结束文字输入、取消工具或清除选区；清除后 Tab 可离开画布'],
      ['Ctrl+A', '选择全部顶层对象'],
      ['Ctrl+C / X / V', '复制 / 剪切 / 粘贴对象；跨项目图片使用导入'],
      ['Ctrl+D', '复制所选对象；页面列表中复制页面'],
      ['Delete / Backspace', '删除选中的对象或主库页面'],
      ['Ctrl+G / Ctrl+Shift+G', '组合 / 取消组合'],
      ['V / T / R / L', '选择 / 文字 / 矩形 / 线条工具'],
    ],
  },
  {
    title: '页面与工作区',
    items: [
      ['↑ ↓ / Home / End', '在页面列表或图层中导航'],
      ['PageUp / PageDown', '当前集合的上一页 / 下一页'],
      ['Enter', '从页面列表或图层进入画布'],
      ['F6 / Shift+F6', '切换到下一个 / 上一个面板'],
      ['Ctrl+M', '新增主库页面；演讲中打开编排'],
      ['Ctrl+S', '保存当前页面草稿'],
      ['Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y', '撤销 / 重做文档操作'],
      ['F1', '打开键盘操作帮助'],
    ],
  },
  {
    title: '文字与演示',
    items: [
      ['Esc / Ctrl+Enter', '结束画布文字编辑，返回对象'],
      ['Enter / Esc', '属性字段提交 / 取消；输入中保留原生键盘行为'],
      ['F5 / Shift+F5', '从第一页 / 当前页开始演示'],
      ['方向键 / 空格 / PageUp / PageDown', '演示中前进或返回'],
      ['Home / End / Esc', '演示中到首尾页 / 退出演示'],
    ],
  },
] as const;
