const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { createProject, pathKey, readPreferences, writePreferences } = require('./project.cjs');
const { startService, stopService } = require('./service.cjs');

app.setName('HUANDING Editor');
if (process.env.HUANDING_DESKTOP_DATA_DIR) {
  app.setPath('userData', path.resolve(process.env.HUANDING_DESKTOP_DATA_DIR));
}
if (process.platform === 'win32') app.setAppUserModelId('huanding.editor');

const preferencesFile = path.join(app.getPath('userData'), 'preferences.json');
const logFile = path.join(app.getPath('userData'), 'desktop-service.log');
const welcomeFile = path.join(__dirname, 'welcome.html');
const pendingLeaves = new Map();
let window;
let activeService = null;
let preferences = { recentProjects: [] };
let operations = Promise.resolve();
let preferenceWrites = Promise.resolve();
let allowClose = false;
let closing = false;
let stopping = false;

function commandLine(argv) {
  const args = argv.slice(app.isPackaged ? 1 : 2);
  const entryFlag = args.indexOf('--entry');
  const entry = entryFlag === -1 ? args.find((arg) => /\.pptd$/i.test(arg)) : args[entryFlag + 1];
  return { entry, readOnly: args.includes('--read-only'), welcome: args.includes('--welcome') };
}

function log(message) {
  void fs.appendFile(logFile, message).catch(() => {});
}

function context() {
  return {
    entryPath: activeService?.entryPath ?? null,
    readOnly: activeService?.readOnly ?? false,
    serviceUrl: activeService?.url ?? null,
  };
}

function updateTitle() {
  window?.setTitle(
    activeService
      ? `${activeService.title || path.basename(path.dirname(activeService.entryPath))} — HUANDING Editor${activeService.readOnly ? ' · 只读' : ''}`
      : 'HUANDING Editor',
  );
}

function savePreferences() {
  const snapshot = structuredClone(preferences);
  preferenceWrites = preferenceWrites
    .catch(() => {})
    .then(() => writePreferences(preferencesFile, snapshot));
  return preferenceWrites;
}

function status(message) {
  if (!window?.isDestroyed()) window?.webContents.send('huanding:status', { message });
}

function operate(action) {
  const result = operations
    .catch(() => {})
    .then(async () => {
      window?.setProgressBar(2);
      try {
        return await action();
      } finally {
        window?.setProgressBar(-1);
        status('');
      }
    });
  operations = result;
  return result;
}

function showError(error) {
  const message = error instanceof Error ? error.message : String(error);
  log(`${new Date().toISOString()} ${message}\n`);
  if (window && !window.isDestroyed()) {
    void dialog.showMessageBox(window, {
      type: 'error',
      title: 'HUANDING Editor',
      message: '操作未完成',
      detail: message,
      buttons: ['返回编辑器'],
    });
  }
}

async function flushBeforeLeave() {
  if (!activeService || !window || window.isDestroyed()) return;
  const requestId = randomUUID();
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingLeaves.delete(requestId);
      reject(new Error('页面尚未确认保存完成。请检查未保存的修改或冲突，然后再试。'));
    }, 15000);
    pendingLeaves.set(requestId, { resolve, reject, timer });
    window.webContents.send('huanding:before-leave', requestId);
  });
}

async function rememberProject(service) {
  preferences.lastProject = service.entryPath;
  preferences.lastReadOnly = service.readOnly;
  preferences.recentProjects = [
    { entryPath: service.entryPath, title: service.title, openedAt: new Date().toISOString() },
    ...preferences.recentProjects.filter(
      (item) => pathKey(item.entryPath) !== pathKey(service.entryPath),
    ),
  ].slice(0, 12);
  await savePreferences().catch((error) => log(`Preferences: ${String(error)}\n`));
  app.addRecentDocument(service.entryPath);
  buildMenu();
}

async function loadProject(entry, options = {}) {
  await flushBeforeLeave();
  const canonical = await fs.realpath(path.resolve(entry));
  if (activeService && pathKey(activeService.entryPath) === pathKey(canonical)) {
    window.focus();
    return { entryPath: canonical };
  }
  status('正在打开项目…');
  const previous = activeService;
  const service = await startService(canonical, { ...options, onLog: log });
  activeService = service;
  try {
    await window.loadURL(`${service.url}/huandeng`);
  } catch (error) {
    activeService = previous;
    await stopService(service);
    if (previous && !window.webContents.getURL().startsWith(previous.url)) {
      await window.loadURL(`${previous.url}/huandeng`).catch(() => {});
    } else if (!previous) {
      await window.loadFile(welcomeFile);
    }
    updateTitle();
    throw error;
  }
  updateTitle();
  window.webContents.send('huanding:context-changed', context());
  await rememberProject(service);
  await stopService(previous);
  return { entryPath: service.entryPath };
}

async function showHome() {
  await flushBeforeLeave();
  const previous = activeService;
  activeService = null;
  try {
    await window.loadFile(welcomeFile);
  } catch (error) {
    activeService = previous;
    throw error;
  }
  updateTitle();
  preferences.lastProject = null;
  await savePreferences().catch((error) => log(`Preferences: ${String(error)}\n`));
  await stopService(previous);
  buildMenu();
}

async function chooseProject() {
  const selection = await dialog.showOpenDialog(window, {
    title: '打开 HUANDING 项目',
    defaultPath: activeService?.entryPath ?? preferences.lastProject ?? app.getPath('documents'),
    filters: [{ name: 'PPTD 项目', extensions: ['pptd'] }],
    properties: ['openFile'],
  });
  if (selection.canceled || !selection.filePaths[0]) return null;
  return loadProject(selection.filePaths[0]);
}

async function newProject() {
  const selection = await dialog.showSaveDialog(window, {
    title: '新建 HUANDING 项目 · 将创建同名文件夹',
    defaultPath: path.join(app.getPath('documents'), 'Untitled.pptd'),
    filters: [{ name: '项目名称（创建独立文件夹）', extensions: ['pptd'] }],
    buttonLabel: '创建项目',
  });
  if (selection.canceled || !selection.filePath) return null;
  await flushBeforeLeave();
  const entry = await createProject(selection.filePath);
  return loadProject(entry);
}

async function revealPath(relativePath) {
  if (!activeService) return;
  const root = path.dirname(activeService.entryPath);
  if (!relativePath || relativePath === '.') {
    const error = await shell.openPath(root);
    if (error) throw new Error(error);
    return;
  }
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`)) {
    throw new Error('请选择当前项目中的文件。');
  }
  await fs.access(target);
  shell.showItemInFolder(target);
}

function menuAction(action) {
  return () => {
    void operate(action).catch(showError);
  };
}

function buildMenu() {
  const recent = preferences.recentProjects.map((item) => ({
    label: item.title || path.basename(path.dirname(item.entryPath)),
    sublabel: item.entryPath,
    click: menuAction(() => loadProject(item.entryPath)),
  }));
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '新建项目…', accelerator: 'CmdOrCtrl+N', click: menuAction(newProject) },
        { label: '打开项目…', accelerator: 'CmdOrCtrl+O', click: menuAction(chooseProject) },
        {
          label: '最近项目',
          submenu: recent.length ? recent : [{ label: '暂无最近项目', enabled: false }],
        },
        { type: 'separator' },
        {
          label: '在文件管理器中显示',
          enabled: Boolean(activeService),
          click: menuAction(() => revealPath()),
        },
        { label: '回到开始页', enabled: Boolean(activeService), click: menuAction(showHome) },
        { type: 'separator' },
        { label: '关闭窗口', accelerator: 'CmdOrCtrl+W', click: () => window.close() },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大界面' },
        { role: 'zoomOut', label: '缩小界面' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于 HUANDING Editor',
          click: () => {
            void dialog.showMessageBox(window, {
              title: 'HUANDING Editor',
              message: 'HUANDING Editor',
              detail:
                '独立页面，持续演进。\n\nHUANDING Frame 记录意图。\nHUANDING Plugin 连接外部 Agent。',
              buttons: ['关闭'],
            });
          },
        },
      ],
    },
  ];
  if (process.platform === 'darwin')
    template.unshift({ role: 'appMenu', label: 'HUANDING Editor' });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function assertMainFrame(event) {
  if (
    !window ||
    event.sender !== window.webContents ||
    event.senderFrame !== window.webContents.mainFrame
  ) {
    throw new Error('此操作只适用于当前 HUANDING 窗口。');
  }
}

function registerIpc() {
  const handle = (name, handler) => {
    ipcMain.handle(name, (event, ...args) => {
      assertMainFrame(event);
      return handler(...args);
    });
  };
  handle('huanding:open-project', () => operate(chooseProject));
  handle('huanding:new-project', () => operate(newProject));
  handle('huanding:get-context', context);
  handle('huanding:show-home', () => operate(showHome));
  handle('huanding:reveal-path', revealPath);
  handle('huanding:recent-projects', async () =>
    Promise.all(
      preferences.recentProjects.map(async (item) => ({
        ...item,
        missing: await fs.access(item.entryPath).then(
          () => false,
          () => true,
        ),
      })),
    ),
  );
  handle('huanding:open-recent', (entry) => {
    const item = preferences.recentProjects.find(
      (candidate) => pathKey(candidate.entryPath) === pathKey(entry),
    );
    if (!item) throw new Error('这个项目不在最近项目中，请通过“打开项目”选择。');
    return operate(() => loadProject(item.entryPath));
  });
  ipcMain.on('huanding:before-leave-result', (event, result) => {
    assertMainFrame(event);
    const pending = pendingLeaves.get(result.requestId);
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingLeaves.delete(result.requestId);
    if (result.ok) pending.resolve();
    else pending.reject(new Error(result.message || '页面仍有未保存的修改。'));
  });
}

async function createWindow() {
  const bounds = preferences.windowBounds ?? {};
  window = new BrowserWindow({
    width: bounds.width ?? 1440,
    height: bounds.height ?? 920,
    ...(bounds.x !== undefined ? { x: bounds.x, y: bounds.y } : {}),
    minWidth: 1040,
    minHeight: 680,
    title: 'HUANDING Editor',
    backgroundColor: '#f4f3ee',
    icon: path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.once('ready-to-show', () => window.show());
  window.on('page-title-updated', (event) => {
    event.preventDefault();
    updateTitle();
  });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (activeService && new URL(url).origin === activeService.url)
      window.webContents.downloadURL(url);
    else if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    if (activeService && new URL(url).origin === activeService.url) return;
    if (url.startsWith('file:') && fileURLToPath(url) === welcomeFile) return;
    event.preventDefault();
    if (/^https?:/.test(url)) void shell.openExternal(url);
  });
  window.webContents.on('will-prevent-unload', () => {
    allowClose = false;
    closing = false;
  });
  window.on('close', (event) => {
    if (allowClose) return;
    event.preventDefault();
    if (closing) return;
    closing = true;
    void operate(async () => {
      await flushBeforeLeave();
      preferences.windowBounds = window.getNormalBounds();
      await savePreferences().catch((error) => log(`Preferences: ${String(error)}\n`));
      allowClose = true;
      window.close();
    }).catch((error) => {
      closing = false;
      showError(error);
    });
  });
  window.on('closed', () => {
    window = null;
    for (const pending of pendingLeaves.values()) clearTimeout(pending.timer);
    pendingLeaves.clear();
    stopping = true;
    void stopService(activeService).finally(() => app.quit());
  });
  buildMenu();
  await window.loadFile(welcomeFile);
}

const acquired = app.requestSingleInstanceLock();
if (!acquired) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.focus();
    const requested = commandLine(argv);
    if (requested.entry)
      void operate(() => loadProject(requested.entry, requested)).catch(showError);
  });
  app.on('before-quit', (event) => {
    if (window && !allowClose) {
      event.preventDefault();
      window.close();
    } else if (!window && !stopping) {
      stopping = true;
    }
  });
  app.on('window-all-closed', () => {});
  let macEntry;
  app.on('open-file', (event, entry) => {
    event.preventDefault();
    if (!window) macEntry = entry;
    else void operate(() => loadProject(entry)).catch(showError);
  });
  void app
    .whenReady()
    .then(async () => {
      await fs.mkdir(app.getPath('userData'), { recursive: true });
      preferences = await readPreferences(preferencesFile);
      registerIpc();
      await createWindow();
      const requested = commandLine(process.argv);
      const entry =
        macEntry ?? requested.entry ?? (requested.welcome ? null : preferences.lastProject);
      if (entry) {
        await operate(() =>
          loadProject(entry, {
            readOnly: requested.entry ? requested.readOnly : preferences.lastReadOnly,
          }),
        ).catch(showError);
      }
    })
    .catch((error) => {
      dialog.showErrorBox('HUANDING Editor', String(error));
      app.quit();
    });
}
