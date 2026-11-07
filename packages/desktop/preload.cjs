const { contextBridge, ipcRenderer } = require('electron');

const leaveHandlers = new Set();

ipcRenderer.on('huandeng:before-leave', async (_event, requestId) => {
  try {
    for (const handler of leaveHandlers) await handler();
    await new Promise((resolve) => setTimeout(resolve, 0));
    ipcRenderer.send('huandeng:before-leave-result', { requestId, ok: true });
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
  openProject: () => ipcRenderer.invoke('huandeng:open-project'),
  newProject: () => ipcRenderer.invoke('huandeng:new-project'),
  recentProjects: () => ipcRenderer.invoke('huandeng:recent-projects'),
  openRecent: (entryPath) => ipcRenderer.invoke('huandeng:open-recent', entryPath),
  revealPath: (relativePath) => ipcRenderer.invoke('huandeng:reveal-path', relativePath),
  getContext: () => ipcRenderer.invoke('huandeng:get-context'),
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
