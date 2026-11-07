const desktop = window.huandengDesktop;
const statusElement = document.getElementById('status');
const projectList = document.getElementById('recent-projects');
const recentCount = document.getElementById('recent-count');
const emptyRecents = document.getElementById('empty-recents');
const openButton = document.getElementById('open-project');
const newButton = document.getElementById('new-project');
let busy = false;

function setBusy(value) {
  busy = value;
  projectList.setAttribute('aria-busy', String(value));
  for (const button of document.querySelectorAll('button')) {
    button.disabled = value || button.dataset.missing === 'true';
  }
}

async function run(action, message) {
  if (busy) return;
  setBusy(true);
  statusElement.dataset.state = 'busy';
  statusElement.textContent = message;
  try {
    await action();
    statusElement.textContent = '';
    statusElement.dataset.state = 'idle';
  } catch (error) {
    statusElement.textContent = error instanceof Error ? error.message : String(error);
    statusElement.dataset.state = 'error';
  } finally {
    setBusy(false);
  }
}

openButton.addEventListener('click', () => run(() => desktop.openProject(), '正在打开项目…'));
newButton.addEventListener('click', () => run(() => desktop.newProject(), '正在新建项目…'));
desktop.onStatus(({ message }) => {
  if (!message && busy) return;
  statusElement.textContent = message;
  statusElement.dataset.state = message ? 'busy' : 'idle';
});

if (desktop.platform === 'darwin') {
  for (const key of document.querySelectorAll('kbd')) {
    key.textContent = key.textContent.replace('Ctrl', '⌘');
  }
  openButton.setAttribute('aria-keyshortcuts', 'Meta+O');
  newButton.setAttribute('aria-keyshortcuts', 'Meta+N');
}

function icon(viewBox, paths, className) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  for (const d of paths) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

function openedDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return '今天';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return '昨天';
  return new Intl.DateTimeFormat('zh-CN', {
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

void desktop
  .recentProjects()
  .then((projects) => {
    emptyRecents.hidden = projects.length > 0;
    recentCount.textContent = projects.length ? String(projects.length) : '';
    for (const project of projects) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project';
      button.title = project.entryPath;
      button.disabled = project.missing || busy;
      button.dataset.missing = String(Boolean(project.missing));
      button.dataset.entry = project.entryPath;
      const projectIcon = document.createElement('span');
      projectIcon.className = 'project-icon';
      projectIcon.append(icon('0 0 24 24', ['M4 3h12l4 4v14H4z', 'M15 3v5h5M8 12h8M8 16h5']));
      const body = document.createElement('span');
      body.className = 'project-body';
      const title = document.createElement('strong');
      title.textContent = project.title || project.entryPath.split(/[\\/]/).slice(-2, -1)[0];
      const location = document.createElement('small');
      location.textContent = project.missing
        ? `文件已移动 · ${project.entryPath}`
        : project.entryPath;
      const time = document.createElement('span');
      time.className = 'project-time';
      time.textContent = openedDate(project.openedAt);
      if (time.textContent) time.title = new Date(project.openedAt).toLocaleString('zh-CN');
      body.append(title, location);
      button.append(projectIcon, body, time, icon('0 0 24 24', ['M9 6l6 6-6 6'], 'project-arrow'));
      button.addEventListener('click', () =>
        run(() => desktop.openRecent(project.entryPath), `正在打开「${title.textContent}」…`),
      );
      projectList.append(button);
    }
  })
  .catch((error) => {
    statusElement.textContent = error instanceof Error ? error.message : String(error);
    statusElement.dataset.state = 'error';
  });
