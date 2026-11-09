const { contextBridge, ipcRenderer } = require('electron');

const leaveHandlers = new Set();

ipcRenderer.on('huandeng:before-leave', async (_event, requestId) => {
  try {
    let workspaceLayout;
    for (const handler of leaveHandlers) {
      const result = await handler();
      if (result?.workspaceLayout) workspaceLayout = result.workspaceLayout;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    ipcRenderer.send('huandeng:before-leave-result', {
      requestId,
      ok: true,
      ...(workspaceLayout ? { workspaceLayout } : {}),
    });
  } catch (error) {
    ipcRenderer.send('huandeng:before-leave-result', {
      requestId,
      ok: false,
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

const subscribe = (channel, callback) => {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('huandengDesktop', {
  platform: process.platform,
  workspaceTabs: true,
  getWorkspace: () => ipcRenderer.invoke('huandeng:get-workspace'),
  activateProject: (id) => ipcRenderer.invoke('huandeng:activate-project', id),
  closeProject: (id) => ipcRenderer.invoke('huandeng:close-project', id),
  reportProjectState: (value) => ipcRenderer.invoke('huandeng:project-state', value),
  onWorkspaceChanged: (callback) => subscribe('huandeng:workspace-changed', callback),
  onRecentsChanged: (callback) => subscribe('huandeng:recents-changed', callback),
  onCloseDocument: (callback) => subscribe('huandeng:close-document', callback),
  setPresentationMode: (active) => ipcRenderer.invoke('huandeng:set-presentation-mode', active),
  setFullscreen: (fullscreen) => ipcRenderer.invoke('huandeng:set-fullscreen', fullscreen),
  onFullscreenChanged: (callback) => subscribe('huandeng:fullscreen-changed', callback),
  getWorkspaceLayout: (clientId) => ipcRenderer.invoke('huandeng:get-workspace-layout', clientId),
  setWorkspaceLayout: (value) => ipcRenderer.invoke('huandeng:set-workspace-layout', value),
  getLocale: () => ipcRenderer.invoke('huandeng:get-locale'),
  setLocale: (locale) => ipcRenderer.invoke('huandeng:set-locale', locale),
  onLocaleChanged: (callback) => subscribe('huandeng:locale-changed', callback),
  getSnapping: () => ipcRenderer.invoke('huandeng:get-snapping'),
  setSnapping: (enabled) => ipcRenderer.invoke('huandeng:set-snapping', enabled),
  onSnappingChanged: (callback) => subscribe('huandeng:snapping-changed', callback),
  openProject: () => ipcRenderer.invoke('huandeng:open-project'),
  newProject: () => ipcRenderer.invoke('huandeng:new-project'),
  recentProjects: () => ipcRenderer.invoke('huandeng:recent-projects'),
  openRecent: (entryPath) => ipcRenderer.invoke('huandeng:open-recent', entryPath),
  revealPath: (relativePath) => ipcRenderer.invoke('huandeng:reveal-path', relativePath),
  getContext: () => ipcRenderer.invoke('huandeng:get-context'),
  getAgentConfiguration: (client) => ipcRenderer.invoke('huandeng:agent-configuration', client),
  onAgentConnection: (callback) => subscribe('huandeng:agent-connection', callback),
  showHome: () => ipcRenderer.invoke('huandeng:show-home'),
  onContextChanged: (callback) => subscribe('huandeng:context-changed', callback),
  onStatus: (callback) => subscribe('huandeng:status', callback),
  onEditCommand: (callback) => subscribe('huandeng:edit-command', callback),
  editNative: (command) => ipcRenderer.invoke('huandeng:edit-native', command),
  onBeforeLeave: (callback) => {
    leaveHandlers.add(callback);
    return () => leaveHandlers.delete(callback);
  },
});
