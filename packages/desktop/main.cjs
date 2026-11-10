const { normalizeWorkspaceLayout, createWorkspaceLayoutWriter } = require('./workspace.cjs');
const {
  text: desktopText,
  getCurrentLocale,
  setCurrentLocale,
  resolveLocale,
} = require('./locale.cjs');
const {
  app,
  BrowserWindow,
  WebContentsView,
  dialog,
  ipcMain,
  Menu,
  nativeTheme,
  shell,
} = require('electron');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { fileURLToPath } = require('node:url');
const { createProject, pathKey, readPreferences, writePreferences } = require('./project.cjs');
const { startService, stopService } = require('./service.cjs');
const { agentConfiguration } = require('./agent-setup.cjs');
const { version: editorVersion } = require('./release.json');
const { migratePreferences } = require('./branding.cjs');
const {
  createProjectTabs,
  contentBounds,
  publicProjectTab,
  createFullscreenController,
  createRendererRecovery,
} = require('./project-tabs.cjs');
const { createPublisherScheduler } = require('./publisher.cjs');
const {
  parseLaunchRequest,
  createLaunchData,
  secondInstanceRequest,
} = require('./launch-request.cjs');

app.setName('HUANDENG Editor');
const desktopDataDir =
  process.env.HUANDENG_DESKTOP_DATA_DIR ?? process.env.HUANDING_DESKTOP_DATA_DIR;
if (desktopDataDir) app.setPath('userData', path.resolve(desktopDataDir));
if (process.platform === 'win32') app.setAppUserModelId('huandeng.editor');
const preferencesFile = path.join(app.getPath('userData'), 'preferences.json');
const logFile = path.join(app.getPath('userData'), 'desktop-service.log');
const welcomeFile = path.join(__dirname, 'welcome.html');
const shellFile = path.join(__dirname, 'workspace-shell.html');
const pendingLeaves = new Map();
const tabs = createProjectTabs();
const publisher = createPublisherScheduler({
  onError: (error) => log(`PPTX publish: ${String(error)}\n`),
});
let window;
let homeView;
let activeService = null;
let preferences = { recentProjects: [] };
let operations = Promise.resolve();
let preferenceWrites = Promise.resolve();
let allowClose = false;
let closing = false;
let stopping = false;
let presentationOwner = null;
let presentationRestoreFullscreen = false;
let presentationRestoresPending = 0;
let launchReady = false;
const pendingLaunchRequests = [];
const fullscreenController = createFullscreenController({
  getWindow: () => window,
  onSettled: layoutViews,
});
const rendererRecovery = createRendererRecovery({
  load: reloadProjectRenderer,
  releasePresentation: (project) =>
    presentationOwner === project.id ? setPresentationMode(project, false) : Promise.resolve(),
  rejectLeaves: (project, message) => {
    for (const [id, pending] of pendingLeaves) {
      if (pending.contentsId !== project.view.webContents.id) continue;
      clearTimeout(pending.timer);
      pendingLeaves.delete(id);
      pending.reject(new Error(message));
    }
  },
  onChanged: (_project, message) => {
    layoutViews();
    publishWorkspace();
    if (message) status(message);
  },
  notify: notifyRendererLoss,
});

function log(message) {
  void fs.appendFile(logFile, message).catch(() => {});
}
function send(contents, channel, value) {
  if (contents && !contents.isDestroyed()) contents.send(channel, value);
}
function activeContents() {
  return tabs.active?.view.webContents ?? homeView?.webContents ?? window?.webContents;
}
function broadcast(channel, value) {
  send(window?.webContents, channel, value);
  send(homeView?.webContents, channel, value);
  for (const item of tabs.list()) send(item.view.webContents, channel, value);
}
function context(project = tabs.active) {
  return {
    entryPath: project?.service.entryPath ?? null,
    readOnly: project?.service.readOnly ?? false,
    serviceUrl: project?.service.url ?? null,
  };
}
function workspaceState() {
  return { activeId: tabs.activeId, projects: tabs.list().map(publicProjectTab) };
}
function publishWorkspace() {
  send(window?.webContents, 'huandeng:workspace-changed', workspaceState());
}
function updateTitle() {
  window?.setTitle(
    activeService
      ? `HUANDENG Editor — ${activeService.title}${activeService.readOnly ? ` · ${desktopText('只读')}` : ''}`
      : 'HUANDENG Editor',
  );
}
function savePreferences() {
  const snapshot = structuredClone(preferences);
  preferenceWrites = preferenceWrites
    .catch(() => {})
    .then(() => writePreferences(preferencesFile, snapshot));
  return preferenceWrites;
}
function saveTabPreferences() {
  preferences.openProjects = tabs
    .list()
    .map(({ service }) => ({ entryPath: service.entryPath, readOnly: service.readOnly }));
  preferences.lastProject = activeService?.entryPath ?? null;
  preferences.lastReadOnly = activeService?.readOnly ?? false;
  return savePreferences();
}
async function changeLocale(locale) {
  if (locale !== 'en' && locale !== 'zh-CN') throw new Error(desktopText('不支持此界面语言。'));
  const previous = preferences.uiLocale;
  preferences.uiLocale = locale;
  try {
    await savePreferences();
  } catch (error) {
    preferences.uiLocale = previous;
    throw error;
  }
  setCurrentLocale(locale);
  buildMenu();
  updateTitle();
  broadcast('huandeng:locale-changed', locale);
  return locale;
}
async function changeSnapping(enabled) {
  if (typeof enabled !== 'boolean') throw new Error(desktopText('吸附设置必须为开启或关闭。'));
  const previous = preferences.snapping;
  preferences.snapping = enabled;
  try {
    await savePreferences();
  } catch (error) {
    preferences.snapping = previous;
    throw error;
  }
  broadcast('huandeng:snapping-changed', enabled);
  return enabled;
}
function layoutWriter(entryKey) {
  return createWorkspaceLayoutWriter({
    read: () => preferences.projectLayouts?.[entryKey] ?? preferences.workspaceLayout,
    write: async (value) => {
      const previous = preferences.projectLayouts;
      const next = normalizeWorkspaceLayout(value);
      preferences.projectLayouts = { ...previous, [entryKey]: next };
      try {
        await savePreferences();
      } catch (error) {
        preferences.projectLayouts = previous;
        throw error;
      }
      return next;
    },
  });
}
function status(message) {
  broadcast('huandeng:status', { message });
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
  if (window && !window.isDestroyed())
    void dialog.showMessageBox(window, {
      type: 'error',
      title: 'HUANDENG Editor',
      message: desktopText('操作未完成'),
      detail: message,
      buttons: [desktopText('返回编辑器')],
    });
}
function layoutViews() {
  if (!window || window.isDestroyed()) return;
  const [width, height] = window.getContentSize();
  const bounds = contentBounds(
    width,
    height,
    presentationOwner === tabs.activeId && presentationOwner !== null,
  );
  if (homeView) {
    homeView.setBounds(bounds);
    homeView.setVisible(tabs.activeId === null);
  }
  for (const item of tabs.list()) {
    item.view.setBounds(bounds);
    item.view.setVisible(item.id === tabs.activeId);
  }
}
function activateProject(id, focus = true) {
  if (presentationOwner !== null && id !== presentationOwner)
    throw new Error('End the presentation before switching Projects.');
  const project = tabs.activate(id);
  activeService = project?.service ?? null;
  layoutViews();
  updateTitle();
  buildMenu();
  publishWorkspace();
  if (focus) activeContents()?.focus();
  void saveTabPreferences().catch((error) => log(`Preferences: ${String(error)}\n`));
  return context(project);
}
function cycleProject(direction) {
  if (presentationOwner !== null) return;
  const projects = tabs.list();
  if (!projects.length) return;
  const index = projects.findIndex((item) => item.id === tabs.activeId);
  activateProject(projects[(index + direction + projects.length) % projects.length].id);
}
async function flushBeforeLeave(project) {
  if (!rendererRecovery.canFlush(project)) return;
  const requestId = randomUUID();
  const result = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingLeaves.delete(requestId);
      reject(
        new Error(
          `${project.service.title}: ${desktopText('页面尚未确认保存完成。请检查未保存的修改或冲突，然后再试。')}`,
        ),
      );
    }, 15000);
    pendingLeaves.set(requestId, {
      resolve,
      reject,
      timer,
      contentsId: project.view.webContents.id,
    });
    project.view.webContents.send('huandeng:before-leave', requestId);
  });
  if (result?.workspaceLayout) await project.layoutWriter.save(result.workspaceLayout);
}
async function rememberProject(service) {
  preferences.recentProjects = [
    { entryPath: service.entryPath, title: service.title, openedAt: new Date().toISOString() },
    ...preferences.recentProjects.filter(
      (item) => pathKey(item.entryPath) !== pathKey(service.entryPath),
    ),
  ].slice(0, 12);
  await saveTabPreferences().catch((error) => log(`Preferences: ${String(error)}\n`));
  app.addRecentDocument(service.entryPath);
  buildMenu();
  send(homeView?.webContents, 'huandeng:recents-changed');
}
function webPreferences() {
  return {
    preload: path.join(__dirname, 'preload.cjs'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  };
}
function allowedUrl(project, url) {
  try {
    if (project) return new URL(url).origin === project.service.url;
    return url.startsWith('file:') && [welcomeFile, shellFile].includes(fileURLToPath(url));
  } catch {
    return false;
  }
}
function configureContents(contents, project = null) {
  contents.on('page-title-updated', (event) => {
    event.preventDefault();
    updateTitle();
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (project && allowedUrl(project, url)) contents.downloadURL(url);
    else if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  contents.on('will-navigate', (event, url) => {
    if (allowedUrl(project, url)) return;
    event.preventDefault();
    if (/^https?:/.test(url)) void shell.openExternal(url);
  });
  contents.on('enter-html-full-screen', () => {
    if (project?.id !== tabs.activeId) return;
    if (presentationOwner === null) {
      presentationRestoreFullscreen = window.isFullScreen();
      presentationOwner = project.id;
    }
    layoutViews();
  });
  contents.on('leave-html-full-screen', () => {
    if (project?.id === presentationOwner && !project.presentationMode) {
      presentationOwner = null;
      layoutViews();
    }
  });
  contents.on('render-process-gone', (_event, details) => {
    if (!project) return;
    void rendererRecovery.lost(project, details).catch(showError);
  });
}

async function reloadProjectRenderer(project) {
  if (tabs.get(project.id) !== project || !window || window.isDestroyed())
    throw new Error('This Project is no longer open.');
  if (project.view.webContents.isDestroyed()) {
    window.contentView.removeChildView(project.view);
    project.view = new WebContentsView({ webPreferences: webPreferences() });
    window.contentView.addChildView(project.view);
    configureContents(project.view.webContents, project);
    layoutViews();
  }
  // Reuse this Project's service and writer. Recovery never copies or replaces document files.
  await project.view.webContents.loadURL(`${project.service.url}/huandeng`);
  send(project.view.webContents, 'huandeng:context-changed', context(project));
}

function notifyRendererLoss(project, message) {
  if (!window || tabs.get(project.id) !== project) return;
  status(message);
  // An unparented warning leaves the other Project tabs available during recovery.
  void dialog
    .showMessageBox({
      type: 'warning',
      title: 'HUANDENG Editor',
      message: desktopText('项目编辑视图已停止'),
      detail: `${message}\n\n${desktopText('重新载入会将此项目连接到现有文档服务。其他项目保持打开。')}`,
      buttons: [desktopText('重新载入项目'), desktopText('关闭项目'), desktopText('保持打开')],
      defaultId: 2,
      cancelId: 2,
      noLink: true,
    })
    .then(({ response }) => {
      if (!window || tabs.get(project.id) !== project || !project.rendererLost) return;
      if (response === 0)
        void operate(async () => {
          await rendererRecovery.reload(project);
          activateProject(project.id);
        }).catch(showError);
      if (response === 1) void operate(() => closeProject(project.id)).catch(showError);
    })
    .catch(showError);
}

async function loadProject(entry, options = {}) {
  const canonical = await fs.realpath(path.resolve(entry));
  const entryKey = pathKey(canonical);
  const existing = tabs.find(entryKey);
  if (existing) {
    if (options.readOnly !== undefined && Boolean(options.readOnly) !== existing.service.readOnly)
      throw new Error(
        'This Project is already open in a different read/write mode. Close its tab before changing modes.',
      );
    if (existing.rendererLost) await rendererRecovery.reload(existing);
    activateProject(existing.id);
    window.focus();
    return { entryPath: canonical };
  }
  status(desktopText('正在打开项目…'));
  const service = await startService(canonical, { ...options, onLog: log });
  const view = new WebContentsView({ webPreferences: webPreferences() });
  const project = {
    id: randomUUID(),
    entryKey,
    service,
    view,
    layoutWriter: layoutWriter(entryKey),
    state: {},
    presentationMode: false,
    rendererLost: false,
    disposing: false,
  };
  tabs.add(project);
  view.setVisible(false);
  window.contentView.addChildView(view);
  configureContents(view.webContents, project);
  try {
    await view.webContents.loadURL(`${service.url}/huandeng`);
    activateProject(project.id);
  } catch (error) {
    tabs.remove(project.id);
    window.contentView.removeChildView(view);
    view.webContents.close();
    await stopService(service);
    layoutViews();
    publishWorkspace();
    throw error;
  }
  send(view.webContents, 'huandeng:context-changed', context(project));
  await rememberProject(service);
  return { entryPath: service.entryPath };
}
async function showHome() {
  activateProject(null);
  send(homeView?.webContents, 'huandeng:recents-changed');
}
async function chooseProject(project = tabs.active) {
  const selection = await dialog.showOpenDialog(window, {
    title: desktopText('打开 HUANDENG 项目'),
    defaultPath: project?.service.entryPath ?? preferences.lastProject ?? app.getPath('documents'),
    filters: [{ name: desktopText('PPTD 项目'), extensions: ['pptd'] }],
    properties: ['openFile', 'multiSelections'],
  });
  if (selection.canceled || !selection.filePaths.length) return null;
  let result;
  for (const entry of selection.filePaths) result = await loadProject(entry);
  return result;
}
async function newProject() {
  const selection = await dialog.showSaveDialog(window, {
    title: desktopText('新建 HUANDENG 项目文件夹 · 内含 deck.pptd'),
    defaultPath: path.join(app.getPath('documents'), 'Untitled.pptd'),
    filters: [{ name: desktopText('项目名称（创建独立文件夹）'), extensions: ['pptd'] }],
    buttonLabel: desktopText('创建项目'),
  });
  if (selection.canceled || !selection.filePath) return null;
  return loadProject(await createProject(selection.filePath));
}
async function closeProject(id) {
  const project = tabs.get(id);
  if (!project) return;
  await flushBeforeLeave(project);
  if (presentationOwner === id) await setPresentationMode(project, false);
  const contents = project.view.webContents;
  if (!contents.isDestroyed())
    await new Promise((resolve, reject) => {
      const finish = (error) => {
        clearTimeout(timer);
        contents.removeListener('destroyed', destroyed);
        contents.removeListener('will-prevent-unload', prevented);
        if (error) {
          project.disposing = false;
          reject(error);
        } else resolve();
      };
      const destroyed = () => finish();
      const prevented = () =>
        finish(
          new Error(
            'This Project still has unsaved work. Save or discard its drafts before closing.',
          ),
        );
      const timer = setTimeout(
        () => finish(new Error('This Project has not confirmed that it can close.')),
        4000,
      );
      contents.once('destroyed', destroyed);
      contents.once('will-prevent-unload', prevented);
      project.disposing = true;
      contents.close({ waitForBeforeUnload: !project.rendererLost });
    });
  window.contentView.removeChildView(project.view);
  tabs.remove(id);
  activeService = tabs.active?.service ?? null;
  layoutViews();
  updateTitle();
  buildMenu();
  publishWorkspace();
  activeContents()?.focus();
  await stopService(project.service);
  await publisher.flush().catch((error) => {
    if (error.code !== 'ENOENT') log(`PPTX publish: ${String(error)}\n`);
  });
  await saveTabPreferences();
}
async function revealPath(relativePath, project = tabs.active) {
  if (!project) return;
  const root = path.dirname(project.service.entryPath);
  if (!relativePath || relativePath === '.') {
    const error = await shell.openPath(root);
    if (error) throw new Error(error);
    return;
  }
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (path.isAbsolute(relative) || relative === '..' || relative.startsWith(`..${path.sep}`))
    throw new Error(desktopText('请选择当前项目中的文件。'));
  await fs.access(target);
  shell.showItemInFolder(target);
}
function menuAction(action) {
  return () => {
    void operate(action).catch(showError);
  };
}
const nativeEditCommands = new Set(['cut', 'copy', 'paste', 'selectAll', 'undo', 'redo']);
function editNative(command, contents = activeContents()) {
  if (!nativeEditCommands.has(command)) throw new Error(desktopText('不支持这个编辑命令。'));
  if (contents && !contents.isDestroyed()) contents[command]();
}
function editCommand(command) {
  const contents = activeContents();
  if (!contents || contents.isDestroyed()) return;
  if (tabs.active) contents.send('huandeng:edit-command', command);
  else editNative(command, contents);
}
function closeCurrentDocument() {
  if (presentationOwner !== null) return;
  if (tabs.active) send(activeContents(), 'huandeng:close-document');
  else window.close();
}
function changeZoom(delta) {
  const contents = activeContents();
  if (contents && !contents.isDestroyed())
    contents.setZoomLevel(Math.max(-3, Math.min(4, contents.getZoomLevel() + delta)));
}
async function setNativeFullscreen(fullscreen) {
  return fullscreenController.set(fullscreen);
}
async function setPresentationMode(project, active) {
  if (!project || typeof active !== 'boolean') throw new Error('Invalid presentation mode.');
  if (active) {
    if (project.id !== tabs.activeId) throw new Error('Only the active Project can present.');
    if (project.rendererLost)
      throw new Error(
        'Reload this Project before presenting. Unsaved in-memory drafts may have been lost.',
      );
    if (presentationOwner === null && presentationRestoresPending === 0)
      presentationRestoreFullscreen = window.isFullScreen();
    presentationOwner = project.id;
    project.presentationMode = true;
    layoutViews();
    return { fullscreen: await setNativeFullscreen(true) };
  }
  project.presentationMode = false;
  if (presentationOwner === project.id) {
    presentationOwner = null;
    presentationRestoresPending++;
    layoutViews();
    try {
      await setNativeFullscreen(presentationRestoreFullscreen);
    } finally {
      presentationRestoresPending--;
      layoutViews();
    }
  }
  return { fullscreen: window?.isFullScreen() ?? false };
}

function buildMenu() {
  const recent = preferences.recentProjects.map((item) => ({
    label: item.title || path.basename(path.dirname(item.entryPath)),
    sublabel: item.entryPath,
    click: menuAction(() => loadProject(item.entryPath)),
  }));
  const template = [
    {
      label: desktopText('文件'),
      submenu: [
        {
          label: desktopText('新建项目…'),
          accelerator: 'CmdOrCtrl+N',
          click: menuAction(newProject),
        },
        {
          label: desktopText('打开项目…'),
          accelerator: 'CmdOrCtrl+O',
          click: menuAction(chooseProject),
        },
        {
          label: desktopText('最近项目'),
          submenu: recent.length
            ? recent
            : [{ label: desktopText('暂无最近项目'), enabled: false }],
        },
        { type: 'separator' },
        {
          label: desktopText('在文件管理器中显示'),
          enabled: Boolean(activeService),
          click: menuAction(() => revealPath()),
        },
        {
          label: desktopText('回到开始页'),
          enabled: Boolean(activeService),
          click: menuAction(showHome),
        },
        {
          label: desktopText('助手连接…'),
          enabled: Boolean(activeService),
          click: () => activeContents()?.send('huandeng:agent-connection'),
        },
        { type: 'separator' },
        {
          label: desktopText('关闭文件预览'),
          accelerator: 'CmdOrCtrl+W',
          enabled: Boolean(activeService),
          click: closeCurrentDocument,
        },
        {
          label: desktopText('关闭项目'),
          enabled: Boolean(activeService),
          click: menuAction(() => closeProject(tabs.activeId)),
        },
        {
          label: desktopText('关闭窗口'),
          accelerator: 'CmdOrCtrl+Shift+W',
          click: () => window.close(),
        },
      ],
    },
    {
      label: desktopText('编辑'),
      submenu: [
        {
          label: desktopText('撤销'),
          accelerator: 'CmdOrCtrl+Z',
          click: () => editCommand('undo'),
        },
        {
          label: desktopText('重做'),
          accelerator: 'CmdOrCtrl+Shift+Z',
          click: () => editCommand('redo'),
        },
        { type: 'separator' },
        { label: desktopText('剪切'), accelerator: 'CmdOrCtrl+X', click: () => editCommand('cut') },
        {
          label: desktopText('复制'),
          accelerator: 'CmdOrCtrl+C',
          click: () => editCommand('copy'),
        },
        {
          label: desktopText('粘贴'),
          accelerator: 'CmdOrCtrl+V',
          click: () => editCommand('paste'),
        },
        {
          label: desktopText('全选'),
          accelerator: 'CmdOrCtrl+A',
          click: () => editCommand('selectAll'),
        },
      ],
    },
    {
      label: desktopText('视图'),
      submenu: [
        {
          label: desktopText('实际大小'),
          accelerator: 'CmdOrCtrl+0',
          click: () => activeContents()?.setZoomLevel(0),
        },
        {
          label: desktopText('放大界面'),
          accelerator: 'CmdOrCtrl+Plus',
          click: () => changeZoom(0.5),
        },
        {
          label: desktopText('缩小界面'),
          accelerator: 'CmdOrCtrl+-',
          click: () => changeZoom(-0.5),
        },
        { label: desktopText('下一个项目'), accelerator: 'Ctrl+Tab', click: () => cycleProject(1) },
        {
          label: desktopText('上一个项目'),
          accelerator: 'Ctrl+Shift+Tab',
          click: () => cycleProject(-1),
        },
        { type: 'separator' },
        { role: 'togglefullscreen', label: desktopText('全屏') },
        { type: 'separator' },
        {
          label: desktopText('界面语言'),
          submenu: [
            {
              label: 'English',
              type: 'radio',
              checked: getCurrentLocale() === 'en',
              click: menuAction(() => changeLocale('en')),
            },
            {
              label: '简体中文',
              type: 'radio',
              checked: getCurrentLocale() === 'zh-CN',
              click: menuAction(() => changeLocale('zh-CN')),
            },
          ],
        },
      ],
    },
    {
      label: desktopText('帮助'),
      submenu: [
        {
          label: desktopText('关于 HUANDENG Editor'),
          click: () => {
            void dialog.showMessageBox(window, {
              title: 'HUANDENG Editor',
              message: `HUANDENG Editor ${editorVersion}`,
              detail: desktopText(
                '独立页面，持续演进。\n\nHUANDENG Story 记录意图。\nHUANDENG Plugin 连接外部 Agent。',
              ),
              buttons: [desktopText('关闭')],
            });
          },
        },
      ],
    },
  ];
  if (process.platform === 'darwin')
    template.unshift({ role: 'appMenu', label: 'HUANDENG Editor' });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function assertSender(event) {
  if (!window || event.senderFrame !== event.sender.mainFrame)
    throw new Error(desktopText('此操作只适用于当前 HUANDENG 窗口。'));
  const project = tabs.forContents(event.sender.id);
  if (project && allowedUrl(project, event.sender.getURL()))
    return { contents: event.sender, project, shell: false };
  if (
    [window.webContents, homeView?.webContents].includes(event.sender) &&
    allowedUrl(null, event.sender.getURL())
  )
    return { contents: event.sender, project: null, shell: event.sender === window.webContents };
  throw new Error(desktopText('此操作只适用于当前 HUANDENG 窗口。'));
}
function requireProject(sender) {
  if (!sender.project) throw new Error('Open a Project to use this action.');
  return sender.project;
}
function registerIpc() {
  const handle = (name, handler) =>
    ipcMain.handle(name, (event, ...args) => handler(assertSender(event), ...args));
  handle('huandeng:open-project', (sender) =>
    operate(() => chooseProject(sender.project ?? tabs.active)),
  );
  handle('huandeng:new-project', () => operate(newProject));
  handle('huandeng:get-context', (sender) => context(sender.project));
  handle('huandeng:get-workspace', () => workspaceState());
  handle('huandeng:activate-project', (sender, id) => {
    if (!sender.shell) throw new Error('Project switching belongs to the workspace.');
    return operate(() => activateProject(id));
  });
  handle('huandeng:close-project', (sender, id) => {
    const target = sender.shell ? id : requireProject(sender).id;
    return operate(() => closeProject(target));
  });
  handle('huandeng:project-state', (sender, value) => {
    const project = requireProject(sender);
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Invalid Project state.');
    for (const key of ['dirty', 'saving', 'attention', 'activity'])
      if (typeof value[key] === 'boolean') project.state[key] = value[key];
    if (typeof value.title === 'string' && value.title.trim())
      project.service.title = value.title.trim().slice(0, 300);
    if (typeof value.revision === 'string' && value.revision.length <= 100000) {
      if (project.revision && project.revision !== value.revision && !project.service.readOnly)
        publisher.schedule(project.service.entryPath);
      project.revision = value.revision;
    }
    publishWorkspace();
    updateTitle();
  });
  handle('huandeng:agent-configuration', (sender, client) =>
    agentConfiguration({
      client,
      entryPath: requireProject(sender).service.entryPath,
      applicationDirectory: __dirname,
      executable: process.execPath,
    }),
  );
  handle('huandeng:get-workspace-layout', (sender, clientId) =>
    requireProject(sender).layoutWriter.open(clientId),
  );
  handle('huandeng:set-workspace-layout', (sender, value) =>
    operate(() => requireProject(sender).layoutWriter.save(value)),
  );
  handle('huandeng:get-locale', () => getCurrentLocale());
  handle('huandeng:set-locale', (_sender, locale) => operate(() => changeLocale(locale)));
  handle('huandeng:get-snapping', () => preferences.snapping !== false);
  handle('huandeng:set-snapping', (_sender, enabled) => operate(() => changeSnapping(enabled)));
  handle('huandeng:edit-native', (sender, command) => editNative(command, sender.contents));
  handle('huandeng:show-home', () => operate(showHome));
  handle('huandeng:reveal-path', (sender, relativePath) =>
    revealPath(relativePath, requireProject(sender)),
  );
  handle('huandeng:set-presentation-mode', (sender, active) =>
    setPresentationMode(requireProject(sender), active),
  );
  handle('huandeng:set-fullscreen', (sender, fullscreen) => {
    if (requireProject(sender).id !== tabs.activeId)
      throw new Error('Only the active Project can change fullscreen.');
    return setNativeFullscreen(fullscreen);
  });
  handle('huandeng:recent-projects', async () =>
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
  handle('huandeng:open-recent', (_sender, entry) => {
    const item = preferences.recentProjects.find(
      (candidate) => pathKey(candidate.entryPath) === pathKey(entry),
    );
    if (!item) throw new Error(desktopText('这个项目不在最近项目中，请通过“打开项目”选择。'));
    return operate(() => loadProject(item.entryPath));
  });
  ipcMain.on('huandeng:before-leave-result', (event, result) => {
    try {
      assertSender(event);
    } catch {
      return;
    }
    if (!result || typeof result.requestId !== 'string') return;
    const pending = pendingLeaves.get(result.requestId);
    if (!pending || pending.contentsId !== event.sender.id) return;
    clearTimeout(pending.timer);
    pendingLeaves.delete(result.requestId);
    if (result.ok) pending.resolve({ workspaceLayout: result.workspaceLayout });
    else pending.reject(new Error(result.message || desktopText('页面仍有未保存的修改。')));
  });
}
async function createWindow() {
  const bounds = preferences.windowBounds ?? {};
  const chromeColors = () =>
    nativeTheme.shouldUseDarkColors
      ? { color: '#17191c', symbolColor: '#e8eaed' }
      : { color: '#eceef0', symbolColor: '#252a2f' };
  window = new BrowserWindow({
    width: bounds.width ?? 1440,
    height: bounds.height ?? 920,
    ...(bounds.x !== undefined ? { x: bounds.x, y: bounds.y } : {}),
    minWidth: 1040,
    minHeight: 680,
    title: 'HUANDENG Editor',
    backgroundColor: chromeColors().color,
    icon: path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'win32'
      ? {
          titleBarStyle: 'hidden',
          titleBarOverlay: { ...chromeColors(), height: 41 },
        }
      : {}),
    webPreferences: webPreferences(),
  });
  const updateChrome = () => {
    if (!window || window.isDestroyed()) return;
    window.setBackgroundColor(chromeColors().color);
    if (process.platform === 'win32') window.setTitleBarOverlay({ ...chromeColors(), height: 41 });
  };
  nativeTheme.on('updated', updateChrome);
  window.once('closed', () => nativeTheme.removeListener('updated', updateChrome));
  configureContents(window.webContents);
  homeView = new WebContentsView({ webPreferences: webPreferences() });
  configureContents(homeView.webContents);
  window.contentView.addChildView(homeView);
  const editorPermission = (contents, permission, requestingUrl, isMainFrame) => {
    const project = contents ? tabs.forContents(contents.id) : null;
    return Boolean(
      project &&
        project.id === tabs.activeId &&
        isMainFrame !== false &&
        ['local-fonts', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen'].includes(
          permission,
        ) &&
        allowedUrl(project, requestingUrl || contents.getURL()),
    );
  };
  window.webContents.session.setPermissionCheckHandler((contents, permission, origin, details) =>
    editorPermission(contents, permission, details.requestingUrl || origin, details.isMainFrame),
  );
  window.webContents.session.setPermissionRequestHandler(
    (contents, permission, callback, details) =>
      callback(editorPermission(contents, permission, details.requestingUrl, details.isMainFrame)),
  );
  window.on('resize', layoutViews);
  for (const event of ['enter-full-screen', 'leave-full-screen'])
    window.on(event, () => {
      layoutViews();
      broadcast('huandeng:fullscreen-changed', window.isFullScreen());
    });
  window.on('close', (event) => {
    if (allowClose) return;
    event.preventDefault();
    if (closing) return;
    closing = true;
    void operate(async () => {
      const ordered = [
        ...tabs.list().filter((item) => item.id !== tabs.activeId),
        ...(tabs.active ? [tabs.active] : []),
      ];
      for (const project of ordered) await flushBeforeLeave(project);
      preferences.windowBounds = window.getNormalBounds();
      await saveTabPreferences().catch((error) => log(`Preferences: ${String(error)}\n`));
      allowClose = true;
      window.close();
    }).catch((error) => {
      closing = false;
      showError(error);
    });
  });
  window.on('closed', () => {
    window = null;
    for (const pending of pendingLeaves.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Workspace closed.'));
    }
    pendingLeaves.clear();
    if (homeView && !homeView.webContents.isDestroyed()) homeView.webContents.close();
    for (const project of tabs.list())
      if (!project.view.webContents.isDestroyed()) {
        project.disposing = true;
        project.view.webContents.close();
      }
    stopping = true;
    void Promise.allSettled(tabs.list().map((project) => stopService(project.service)))
      .then(() => publisher.flush())
      .catch((error) => {
        if (error.code !== 'ENOENT') log(`PPTX publish: ${String(error)}\n`);
      })
      .finally(() => {
        publisher.dispose();
        app.quit();
      });
  });
  buildMenu();
  await window.loadFile(shellFile);
  await homeView.webContents.loadFile(welcomeFile);
  layoutViews();
  publishWorkspace();
  window.show();
}
function openLaunchRequest(requested) {
  if (!window || !launchReady) {
    pendingLaunchRequests.push(requested);
    return;
  }
  if (window.isMinimized()) window.restore();
  window.focus();
  void operate(async () => {
    if (requested.error) throw new Error('The --entry option requires a .pptd file path.');
    if (requested.entry) return loadProject(requested.entry, requested);
    if (requested.welcome) return showHome();
  }).catch(showError);
}
// Capture the original process arguments before Chromium rebuilds second-instance argv.
const startupRequest = parseLaunchRequest(process.argv, { packaged: app.isPackaged });
const acquired = app.requestSingleInstanceLock(createLaunchData(startupRequest));
if (!acquired) app.quit();
else {
  app.on('second-instance', (_event, argv, workingDirectory, additionalData) => {
    openLaunchRequest(
      secondInstanceRequest(argv, workingDirectory, additionalData, { packaged: app.isPackaged }),
    );
  });
  app.on('before-quit', (event) => {
    if (window && !allowClose) {
      event.preventDefault();
      window.close();
    } else if (!window && !stopping) stopping = true;
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
      if (!desktopDataDir)
        await migratePreferences(
          path.join(app.getPath('appData'), 'HUANDING Editor'),
          app.getPath('userData'),
        );
      await fs.mkdir(app.getPath('userData'), { recursive: true });
      preferences = await readPreferences(preferencesFile);
      const lastProject = preferences.lastProject;
      const lastReadOnly = preferences.lastReadOnly;
      const restore = Array.isArray(preferences.openProjects)
        ? structuredClone(preferences.openProjects)
        : [];
      setCurrentLocale(resolveLocale(preferences.uiLocale, app.getLocale()));
      registerIpc();
      await createWindow();
      const requested = startupRequest;
      if (!requested.welcome)
        for (const item of restore.slice(0, 12)) {
          if (typeof item?.entryPath !== 'string') continue;
          await operate(() =>
            loadProject(item.entryPath, { readOnly: item.readOnly === true }),
          ).catch((error) => log(`Restore Project: ${String(error)}\n`));
        }
      const entry =
        macEntry ?? requested.entry ?? (requested.welcome || requested.error ? null : lastProject);
      if (entry)
        await operate(() =>
          loadProject(entry, { readOnly: requested.entry ? requested.readOnly : lastReadOnly }),
        ).catch(showError);
      else await operate(showHome);
      if (requested.error) showError(new Error('The --entry option requires a .pptd file path.'));
      launchReady = true;
      for (const pending of pendingLaunchRequests.splice(0)) openLaunchRequest(pending);
    })
    .catch((error) => {
      dialog.showErrorBox('HUANDENG Editor', String(error));
      app.quit();
    });
}
