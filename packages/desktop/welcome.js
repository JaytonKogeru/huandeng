const desktop = window.huandingDesktop;
const statusElement = document.getElementById('status');
const projectList = document.getElementById('recent-projects');
const emptyRecents = document.getElementById('empty-recents');
const openButton = document.getElementById('open-project');
const newButton = document.getElementById('new-project');

async function run(action) {
  statusElement.textContent = '';
  openButton.disabled = true;
  newButton.disabled = true;
  try {
    await action();
  } catch (error) {
    statusElement.textContent = error.message;
  } finally {
    openButton.disabled = false;
    newButton.disabled = false;
  }
}

openButton.addEventListener('click', () => run(() => desktop.openProject()));
newButton.addEventListener('click', () => run(() => desktop.newProject()));
desktop.onStatus(({ message }) => {
  statusElement.textContent = message;
});

if (desktop.platform === 'darwin') {
  for (const key of document.querySelectorAll('kbd'))
    key.textContent = key.textContent.replace('Ctrl', '⌘');
}

void desktop
  .recentProjects()
  .then((projects) => {
    emptyRecents.hidden = projects.length > 0;
    for (const project of projects.slice(0, 6)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'project';
      button.title = project.entryPath;
      button.disabled = project.missing;
      button.dataset.entry = project.entryPath;
      const icon = document.createElement('span');
      icon.className = 'project-icon';
      icon.textContent = 'HD';
      const body = document.createElement('span');
      body.className = 'project-body';
      const title = document.createElement('strong');
      title.textContent = project.title || project.entryPath.split(/[\\/]/).slice(-2, -1)[0];
      const location = document.createElement('small');
      location.textContent = project.missing
        ? `文件已移动 · ${project.entryPath}`
        : project.entryPath;
      body.append(title, location);
      button.append(icon, body);
      button.addEventListener('click', () => run(() => desktop.openRecent(project.entryPath)));
      projectList.append(button);
    }
  })
  .catch((error) => {
    statusElement.textContent = error.message;
  });
