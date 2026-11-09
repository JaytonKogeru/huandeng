const desktop = window.huandengDesktop;
const tabs = document.getElementById('project-tabs');
const home = document.getElementById('workspace-home');
const open = document.getElementById('workspace-open');
const status = document.getElementById('workspace-status');
document.body.dataset.platform = desktop.platform;
let current;
let locale = 'en';
const label = (english, chinese) => (locale === 'zh-CN' ? chinese : english);
const run = (action) =>
  Promise.resolve()
    .then(action)
    .catch((error) => {
      status.textContent = error instanceof Error ? error.message : String(error);
    });
function render(state) {
  current = state;
  const focusedId = document.activeElement?.closest('[data-project-id]')?.dataset.projectId;
  tabs.replaceChildren();
  home.setAttribute('aria-pressed', String(state.activeId === null));
  home.title = label('Home', '开始页');
  home.setAttribute('aria-label', home.title);
  open.title = label('Open Project · Ctrl+O', '打开 Project · Ctrl+O');
  open.setAttribute('aria-label', label('Open Project', '打开 Project'));
  for (const project of state.projects) {
    const tab = document.createElement('div');
    tab.className = 'project-tab';
    tab.dataset.projectId = project.id;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(project.id === state.activeId));
    tab.tabIndex = project.id === state.activeId ? 0 : -1;
    tab.title = `${project.title}\n${project.entryPath}`;
    const indicator = document.createElement('span');
    indicator.className = 'project-state';
    indicator.dataset.state = project.attention
      ? 'attention'
      : project.saving
        ? 'saving'
        : project.dirty
          ? 'dirty'
          : project.activity
            ? 'activity'
            : 'saved';
    indicator.title = project.attention
      ? label('Needs attention', '需要处理')
      : project.saving
        ? label('Saving', '正在保存')
        : project.dirty
          ? label('Unsaved drafts', '未保存草稿')
          : project.activity
            ? label('Agent active', 'Agent 正在执行')
            : '';
    const title = document.createElement('span');
    title.className = 'project-title';
    title.textContent = project.title || label('Untitled Project', '未命名 Project');
    const close = document.createElement('button');
    close.className = 'close';
    close.setAttribute('aria-label', `${label('Close Project', '关闭 Project')}: ${project.title}`);
    close.title = label('Close Project', '关闭 Project');
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
      void run(() => desktop.activateProject(project.id));
    });
    tab.addEventListener('keydown', (event) => {
      if (event.target !== tab) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        void run(() => desktop.activateProject(project.id));
      }
      if (event.key === 'Delete') {
        event.preventDefault();
        void run(() => desktop.closeProject(project.id));
      }
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        const position = state.projects.findIndex((item) => item.id === project.id);
        const next =
          state.projects[
            (position + (event.key === 'ArrowRight' ? 1 : -1) + state.projects.length) %
              state.projects.length
          ];
        void run(() => desktop.activateProject(next.id));
      }
    });
    tab.append(indicator, title, close);
    tabs.append(tab);
  }
  if (focusedId)
    tabs.querySelector(`[data-project-id="${focusedId}"]`)?.focus({ preventScroll: true });
  tabs
    .querySelector('[aria-selected="true"]')
    ?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
home.addEventListener('click', () => {
  void run(() => desktop.showHome());
});
open.addEventListener('click', () => {
  void run(() => desktop.openProject());
});
desktop.onWorkspaceChanged(render);
desktop.onStatus(({ message }) => {
  status.textContent = message;
});
desktop.onLocaleChanged((next) => {
  locale = next;
  if (current) render(current);
});
void Promise.all([desktop.getWorkspace(), desktop.getLocale()]).then(([state, next]) => {
  locale = next;
  render(state);
});
