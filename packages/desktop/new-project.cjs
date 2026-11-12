const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { projectLocation, createProject } = require('./project.cjs');

function chooseNewProject({ BrowserWindow, dialog, ipcMain, parent, directory, locale, theme }) {
  const file = path.join(__dirname, 'new-project.html');
  const view = new BrowserWindow({
    parent,
    modal: true,
    width: 640,
    height: 590,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    autoHideMenuBar: true,
    title: locale === 'zh-CN' ? '新建项目' : 'New project',
    webPreferences: {
      preload: path.join(__dirname, 'new-project-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  let parentDirectory = directory;
  let creating = false;
  let result = null;
  const channels = [];
  const handle = (name, fn) => {
    const channel = `huandeng:new-project-${name}`;
    channels.push(channel);
    ipcMain.handle(channel, (event, ...args) => {
      if (
        event.sender !== view.webContents ||
        event.senderFrame !== view.webContents.mainFrame ||
        event.senderFrame.url !== pathToFileURL(file).href
      )
        throw new Error('This action belongs to the New project dialog.');
      return fn(...args);
    });
  };
  handle('settings', () => ({ directory: parentDirectory, locale, theme }));
  handle('location', (name) => projectLocation(parentDirectory, name));
  handle('browse', async () => {
    if (creating) throw new Error('Project creation is already in progress.');
    const selected = await dialog.showOpenDialog(view, {
      title: locale === 'zh-CN' ? '选择父文件夹' : 'Choose parent folder',
      defaultPath: parentDirectory,
      properties: ['openDirectory', 'createDirectory'],
    });
    if (!selected.canceled && selected.filePaths[0]) parentDirectory = selected.filePaths[0];
    return parentDirectory;
  });
  handle('create', async (request) => {
    if (creating) throw new Error('Project creation is already in progress.');
    const location = projectLocation(parentDirectory, request?.name);
    if (!['blank', 'guide'].includes(request?.template)) throw new Error('Choose a project type.');
    creating = true;
    try {
      result = await createProject(path.join(parentDirectory, `${location.name}.pptd`), {
        template: request.template,
        locale,
      });
      view.close();
      return true;
    } finally {
      creating = false;
    }
  });
  handle('cancel', () => {
    if (!creating) view.close();
  });
  view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  view.webContents.on('will-navigate', (event) => event.preventDefault());
  view.webContents.on('will-redirect', (event) => event.preventDefault());
  view.on('close', (event) => {
    if (creating && !result) event.preventDefault();
  });
  return new Promise((resolve, reject) => {
    view.on('closed', () => {
      for (const channel of channels) ipcMain.removeHandler(channel);
      resolve(result);
    });
    view.once('ready-to-show', () => view.show());
    void view.loadFile(file).catch((error) => {
      view.destroy();
      reject(error);
    });
  });
}

module.exports = { chooseNewProject };
