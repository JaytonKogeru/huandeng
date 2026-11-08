const desktop = window.huandengDesktop;
const statusElement = document.getElementById('status');
const projectList = document.getElementById('recent-projects');
const recentCount = document.getElementById('recent-count');
const emptyRecents = document.getElementById('empty-recents');
const openButton = document.getElementById('open-project');
const newButton = document.getElementById('new-project');
let busy = false;
let locale = 'zh-CN';
let recentProjects = [];
const localeSelect = document.getElementById('ui-locale');
const english = {
  项目入口: 'Project actions',
  幻灯编辑器: 'Slide editor',
  打开项目: 'Open project',
  新建项目: 'New project',
  '选择 .pptd 文件继续编辑，或为新内容建立一个项目。':
    'Open a .pptd file to continue, or create a project for something new.',
  '独立页面，持续演进。': 'Independent slides. Evolving stories.',
  '编辑 · 编排 · 演示': 'Edit · Arrange · Present',
  工作空间: 'Workspace',
  继续项目: 'Continue a project',
  '打开最近的文稿，从上次的进度继续。': 'Open a recent project and pick up where you left off.',
  最近项目: 'Recent projects',
  最近打开: 'Last opened',
  从第一份文稿开始: 'Start your first project',
  '打开已有的 PPTD 项目，或新建一份空白文稿。':
    'Open an existing PPTD project, or create a blank one.',
  '项目会出现在这里，方便下次继续。': 'Your projects will appear here for easy access.',
  文件保存在你选择的位置: 'Files stay in the location you choose',
  界面语言: 'Interface language',
  '正在打开项目…': 'Opening project…',
  '正在新建项目…': 'Creating project…',
  今天: 'Today',
  昨天: 'Yesterday',
  文件已移动: 'File moved',
  '正在打开「{title}」…': 'Opening “{title}”…',
};
function t(message, values) {
  const template = locale === 'en' && Object.hasOwn(english, message) ? english[message] : message;
  return values
    ? template.replace(/\{(\w+)\}/g, (match, key) =>
        values[key] === undefined ? match : String(values[key]),
      )
    : template;
}
function applyLocale(next) {
  locale = next === 'en' ? 'en' : 'zh-CN';
  document.documentElement.lang = locale;
  localeSelect.value = locale;
  for (const element of document.querySelectorAll('[data-ui-text]'))
    element.textContent = t(element.dataset.uiText);
  for (const element of document.querySelectorAll('[data-ui-aria]'))
    element.setAttribute('aria-label', t(element.dataset.uiAria));
  renderProjects(recentProjects);
  document.body.dataset.localeReady = 'true';
}
localeSelect.addEventListener('change', () => {
  const previous = locale;
  void desktop
    .setLocale(localeSelect.value)
    .then(applyLocale)
    .catch((error) => {
      localeSelect.value = previous;
      statusElement.textContent = error instanceof Error ? error.message : String(error);
      statusElement.dataset.state = 'error';
    });
});
desktop.onLocaleChanged?.(applyLocale);

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

openButton.addEventListener('click', () => run(() => desktop.openProject(), t('正在打开项目…')));
newButton.addEventListener('click', () => run(() => desktop.newProject(), t('正在新建项目…')));
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
  if (date.toDateString() === now.toDateString()) return t('今天');
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return t('昨天');
  return new Intl.DateTimeFormat(locale, {
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' } : {}),
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

function renderProjects(projects) {
  projectList.replaceChildren();
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
      ? `${t('文件已移动')} · ${project.entryPath}`
      : project.entryPath;
    const time = document.createElement('span');
    time.className = 'project-time';
    time.textContent = openedDate(project.openedAt);
    if (time.textContent) time.title = new Date(project.openedAt).toLocaleString(locale);
    body.append(title, location);
    button.append(projectIcon, body, time, icon('0 0 24 24', ['M9 6l6 6-6 6'], 'project-arrow'));
    button.addEventListener('click', () =>
      run(
        () => desktop.openRecent(project.entryPath),
        t('正在打开「{title}」…', { title: title.textContent }),
      ),
    );
    projectList.append(button);
  }
}

void Promise.all([desktop.getLocale?.() ?? Promise.resolve('zh-CN'), desktop.recentProjects()])
  .then(([initialLocale, projects]) => {
    recentProjects = projects;
    applyLocale(initialLocale);
  })
  .catch((error) => {
    applyLocale(locale);
    statusElement.textContent = error instanceof Error ? error.message : String(error);
    statusElement.dataset.state = 'error';
  });
