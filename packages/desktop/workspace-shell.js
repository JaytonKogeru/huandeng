const desktop = window.huandengDesktop;
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const applyDesktopTheme = (value) => {
  if (value !== 'system' && value !== 'light' && value !== 'dark') return;
  document.documentElement.style.colorScheme = value === 'system' ? 'light dark' : value;
  document.documentElement.dataset.themeMode =
    value === 'system' ? (systemThemeQuery.matches ? 'dark' : 'light') : value;
};
systemThemeQuery.addEventListener('change', () => {
  if (document.documentElement.style.colorScheme === 'light dark') applyDesktopTheme('system');
});
let themeBroadcast = false;
desktop.onThemeChanged?.((value) => {
  themeBroadcast = true;
  applyDesktopTheme(value);
});
void desktop
  .getTheme?.()
  .then((value) => {
    if (!themeBroadcast) applyDesktopTheme(value);
  })
  .catch(() => {});
const tabs = document.getElementById('project-tabs');
const menu = document.getElementById('workspace-menu');
const home = document.getElementById('workspace-home');
const open = document.getElementById('workspace-open');
const layoutButton = document.getElementById('workspace-tab-layout');
const collapseButton = document.getElementById('workspace-tab-collapse');
const caption = document.getElementById('workspace-caption');
const status = document.getElementById('workspace-status');
const dropIndicator = document.getElementById('tab-drop-indicator');
const tabNodes = new Map();
const dragType = 'application/x-huandeng-project-tab';
document.body.dataset.platform = desktop.platform;
let current;
let locale = 'en';
let renderedActive;
let renderedLayout;
let focusIntent;
let dragState;
let scrollFrame;
let suppressClick = false;
const label = (english, chinese) => (locale === 'zh-CN' ? chinese : english);
const run = (action) =>
  Promise.resolve()
    .then(action)
    .catch((error) => {
      status.textContent = error instanceof Error ? error.message : String(error);
    });
const vertical = () => current?.tabLayout?.orientation === 'vertical';
function projectState(project) {
  if (project.attention) return ['attention', label('Needs attention', '需要处理')];
  if (project.saving) return ['saving', label('Saving', '正在保存')];
  if (project.dirty) return ['dirty', label('Unsaved drafts', '未保存草稿')];
  if (project.activity) return ['activity', label('Client reported activity', '客户端已报告活动')];
  return ['saved', ''];
}
function projectMark(project, projects) {
  const parts = project.entryPath.replaceAll('\\', '/').split('/').filter(Boolean);
  let identity = project.title || parts.at(-2) || label('Project', '项目');
  if (projects.some((item) => item.id !== project.id && item.title === project.title))
    identity = parts.at(-2) || identity;
  const words = identity
    .trim()
    .split(/[\s/_-]+/u)
    .filter(Boolean);
  return (
    words.length > 1
      ? words
          .slice(0, 2)
          .map((word) => Array.from(word)[0])
          .join('')
      : Array.from(identity).slice(0, 2).join('')
  ).toLocaleUpperCase();
}
function moveTab(id, direction) {
  const index = current.projects.findIndex((project) => project.id === id);
  if (index < 0 || index + direction < 0 || index + direction >= current.projects.length) return;
  const before =
    direction < 0 ? current.projects[index - 1].id : (current.projects[index + 2]?.id ?? null);
  focusIntent = id;
  void run(() => desktop.moveProject(id, before));
}
function createTab(project) {
  const tab = document.createElement('div');
  tab.className = 'project-tab';
  tab.dataset.projectId = project.id;
  tab.setAttribute('role', 'tab');
  tab.draggable = true;
  const mark = document.createElement('span');
  mark.className = 'project-mark';
  mark.setAttribute('aria-hidden', 'true');
  const indicator = document.createElement('span');
  indicator.className = 'project-state';
  const title = document.createElement('span');
  title.className = 'project-title';
  const close = document.createElement('button');
  close.className = 'close';
  close.draggable = false;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  line.setAttribute('d', 'M6 6l12 12M18 6 6 18');
  svg.append(line);
  close.append(svg);
  close.addEventListener('click', (event) => {
    event.stopPropagation();
    void run(() => desktop.closeProject(project.id));
  });
  tab.addEventListener('click', () => {
    if (!suppressClick) void run(() => desktop.activateProject(project.id));
  });
  tab.addEventListener('auxclick', (event) => {
    if (event.button !== 1) return;
    event.preventDefault();
    void run(() => desktop.closeProject(project.id));
  });
  tab.addEventListener('contextmenu', (event) => {
    event.preventDefault();
    void run(() => desktop.showProjectTabMenu(project.id));
  });
  tab.addEventListener('keydown', (event) => {
    if (event.target !== tab || event.isComposing) return;
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault();
      void run(() => desktop.showProjectTabMenu(project.id));
      return;
    }
    const previous = vertical() ? 'ArrowUp' : 'ArrowLeft';
    const next = vertical() ? 'ArrowDown' : 'ArrowRight';
    if (event.altKey && event.shiftKey && [previous, next].includes(event.key)) {
      event.preventDefault();
      moveTab(project.id, event.key === next ? 1 : -1);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void run(() => desktop.activateProject(project.id));
      return;
    }
    if (event.key === 'Delete') {
      event.preventDefault();
      void run(() => desktop.closeProject(project.id));
      return;
    }
    if ([previous, next, 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const index = current.projects.findIndex((item) => item.id === project.id);
      const position =
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? current.projects.length - 1
            : (index + (event.key === next ? 1 : -1) + current.projects.length) %
              current.projects.length;
      const destination = current.projects[position];
      if (!destination) return;
      focusIntent = destination.id;
      void run(() => desktop.activateProject(destination.id, false));
    }
  });
  tab.addEventListener('dragstart', (event) => {
    if (event.target.closest('button')) {
      event.preventDefault();
      return;
    }
    dragState = {
      id: project.id,
      beforeId: undefined,
      coordinate: null,
      layoutKey: `${current.tabLayout.orientation}:${current.tabLayout.collapsed}`,
    };
    suppressClick = true;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(dragType, project.id);
    tab.classList.add('dragging');
  });
  tab.addEventListener('dragend', finishDrag);
  tab.append(mark, indicator, title, close);
  return tab;
}
function render(state) {
  current = state;
  const layout = state.tabLayout ?? { orientation: 'horizontal', collapsed: false };
  const layoutKey = `${layout.orientation}:${layout.collapsed}`;
  // Keep the native source stable during save reports. A changed layout ends this drag.
  if (dragState) {
    if (dragState.layoutKey !== layoutKey) finishDrag();
    return;
  }
  const focusedId =
    focusIntent ??
    (document.hasFocus()
      ? document.activeElement?.closest('[data-project-id]')?.dataset.projectId
      : null);
  focusIntent = null;
  document.documentElement.lang = locale;
  document.body.dataset.orientation = layout.orientation;
  document.body.dataset.collapsed = String(layout.orientation === 'vertical' && layout.collapsed);
  document
    .querySelector('.project-strip')
    .setAttribute('aria-label', label('Project workspace', '项目工作区'));
  tabs.setAttribute('aria-label', label('Open Projects', '已打开的项目'));
  tabs.setAttribute('aria-orientation', layout.orientation);
  tabs.title = label(
    'Drag to reorder. Alt+Shift+Arrow moves a focused tab. Right-click for actions.',
    '拖动调整顺序。Alt+Shift+方向键移动标签，右键查看操作。',
  );
  home.setAttribute('aria-pressed', String(state.activeId === null));
  for (const [button, text] of [
    [menu, label('Application menu', '应用菜单')],
    [home, label('Home', '开始页')],
    [open, label('Open Project', '打开项目')],
    [
      layoutButton,
      layout.orientation === 'vertical'
        ? label('Use horizontal tabs', '使用水平标签')
        : label('Use vertical tabs', '使用垂直标签'),
    ],
    [
      collapseButton,
      layout.collapsed
        ? label('Expand vertical tabs', '展开垂直标签')
        : label('Collapse vertical tabs', '折叠垂直标签'),
    ],
  ]) {
    button.title = text;
    button.setAttribute('aria-label', text);
  }
  collapseButton.hidden = layout.orientation !== 'vertical';
  collapseButton.setAttribute('aria-expanded', String(!layout.collapsed));
  layoutButton.setAttribute('aria-pressed', String(layout.orientation === 'vertical'));
  caption.textContent =
    state.projects.find((project) => project.id === state.activeId)?.title || 'HUANDENG';
  for (const [id, node] of tabNodes) {
    if (state.projects.some((project) => project.id === id)) continue;
    node.remove();
    tabNodes.delete(id);
  }
  for (const [index, project] of state.projects.entries()) {
    let tab = tabNodes.get(project.id);
    if (!tab) {
      tab = createTab(project);
      tabNodes.set(project.id, tab);
    }
    const selected = project.id === state.activeId;
    const [kind, description] = projectState(project);
    const title = project.title || label('Untitled Project', '未命名项目');
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected || (state.activeId === null && index === 0) ? 0 : -1;
    tab.title = [
      title,
      project.entryPath,
      project.readOnly ? label('Read-only', '只读') : '',
      description,
    ]
      .filter(Boolean)
      .join('\n');
    tab.setAttribute('aria-label', tab.title);
    tab.querySelector('.project-mark').textContent = projectMark(project, state.projects);
    tab.querySelector('.project-title').textContent = title;
    const indicator = tab.querySelector('.project-state');
    indicator.dataset.state = kind;
    indicator.title = description;
    const close = tab.querySelector('.close');
    close.title = label('Close Project', '关闭项目');
    close.setAttribute('aria-label', `${close.title}: ${title}`);
    close.tabIndex = selected ? 0 : -1;
    if (tabs.children[index] !== tab) tabs.insertBefore(tab, tabs.children[index] ?? null);
  }
  if (focusedId) tabNodes.get(focusedId)?.focus({ preventScroll: true });
  if (renderedActive !== state.activeId || renderedLayout !== layoutKey || focusedId)
    (tabNodes.get(focusedId) ?? tabNodes.get(state.activeId))?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    });
  renderedActive = state.activeId;
  renderedLayout = layoutKey;
}
function updateDrop(coordinate) {
  if (!dragState) return;
  dragState.coordinate = coordinate;
  const axis = vertical() ? 'y' : 'x';
  const others = [...tabs.children].filter((tab) => tab.dataset.projectId !== dragState.id);
  const before = others.find((tab) => {
    const rect = tab.getBoundingClientRect();
    return (
      coordinate[axis] < (vertical() ? rect.top + rect.height / 2 : rect.left + rect.width / 2)
    );
  });
  dragState.beforeId = before?.dataset.projectId ?? null;
  const boundary = before?.getBoundingClientRect() ?? others.at(-1)?.getBoundingClientRect();
  const bounds = tabs.getBoundingClientRect();
  if (!boundary) return;
  const position = vertical()
    ? before
      ? boundary.top
      : boundary.bottom
    : before
      ? boundary.left
      : boundary.right;
  dropIndicator.hidden = false;
  if (vertical()) {
    dropIndicator.style.cssText = `left:${bounds.left + 3}px;top:${Math.max(bounds.top, Math.min(bounds.bottom - 3, position))}px;width:${bounds.width - 6}px;height:3px;`;
  } else {
    dropIndicator.style.cssText = `left:${Math.max(bounds.left, Math.min(bounds.right - 3, position))}px;top:${bounds.top + 3}px;width:3px;height:${bounds.height - 6}px;`;
  }
}
function scrollDuringDrag() {
  scrollFrame = undefined;
  if (!dragState?.coordinate) return;
  const bounds = tabs.getBoundingClientRect();
  const position = dragState.coordinate[vertical() ? 'y' : 'x'];
  const start = vertical() ? bounds.top : bounds.left;
  const end = vertical() ? bounds.bottom : bounds.right;
  const delta = position < start + 24 ? -10 : position > end - 24 ? 10 : 0;
  if (delta) {
    if (vertical()) tabs.scrollTop += delta;
    else tabs.scrollLeft += delta;
    updateDrop(dragState.coordinate);
  }
  scrollFrame = requestAnimationFrame(scrollDuringDrag);
}
function finishDrag() {
  if (scrollFrame !== undefined) cancelAnimationFrame(scrollFrame);
  scrollFrame = undefined;
  dragState = undefined;
  dropIndicator.hidden = true;
  for (const tab of tabNodes.values()) tab.classList.remove('dragging');
  if (current) render(current);
  setTimeout(() => {
    suppressClick = false;
  }, 0);
}
tabs.addEventListener('dragover', (event) => {
  if (!dragState || !event.dataTransfer.types.includes(dragType)) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  updateDrop({ x: event.clientX, y: event.clientY });
  if (scrollFrame === undefined) scrollFrame = requestAnimationFrame(scrollDuringDrag);
});
tabs.addEventListener('dragleave', (event) => {
  if (event.relatedTarget instanceof Node && tabs.contains(event.relatedTarget)) return;
  if (dragState) dragState.coordinate = null;
  dropIndicator.hidden = true;
});
tabs.addEventListener('drop', (event) => {
  if (!dragState || event.dataTransfer.getData(dragType) !== dragState.id) return;
  event.preventDefault();
  updateDrop({ x: event.clientX, y: event.clientY });
  const { id, beforeId } = dragState;
  finishDrag();
  if (beforeId !== undefined) void run(() => desktop.moveProject(id, beforeId));
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && dragState) finishDrag();
});
window.addEventListener('blur', () => {
  if (dragState) finishDrag();
});
menu.addEventListener('click', () => {
  void run(() => desktop.showApplicationMenu());
});
home.addEventListener('click', () => {
  void run(() => desktop.showHome());
});
open.addEventListener('click', () => {
  void run(() => desktop.openProject());
});
layoutButton.addEventListener('click', () => {
  void run(() => desktop.setTabLayout({ orientation: vertical() ? 'horizontal' : 'vertical' }));
});
collapseButton.addEventListener('click', () => {
  void run(() => desktop.setTabLayout({ collapsed: !current.tabLayout.collapsed }));
});
desktop.onWorkspaceChanged(render);
desktop.onStatus(({ message }) => {
  status.textContent = message;
});
desktop.onLocaleChanged((next) => {
  locale = next;
  if (current) render(current);
});
void run(async () => {
  const [state, next] = await Promise.all([desktop.getWorkspace(), desktop.getLocale()]);
  locale = next;
  render(current ?? state);
});
