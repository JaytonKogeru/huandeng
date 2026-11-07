const { contextBridge, ipcRenderer } = require('electron');

const leaveHandlers = new Set();

ipcRenderer.on('huanding:before-leave', async (_event, requestId) => {
  try {
    for (const handler of leaveHandlers) await handler();
    await new Promise((resolve) => setTimeout(resolve, 0));
    ipcRenderer.send('huanding:before-leave-result', { requestId, ok: true });
  } catch (error) {
    ipcRenderer.send('huanding:before-leave-result', {
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

contextBridge.exposeInMainWorld('huandingDesktop', {
  platform: process.platform,
  openProject: () => ipcRenderer.invoke('huanding:open-project'),
  newProject: () => ipcRenderer.invoke('huanding:new-project'),
  recentProjects: () => ipcRenderer.invoke('huanding:recent-projects'),
  openRecent: (entryPath) => ipcRenderer.invoke('huanding:open-recent', entryPath),
  revealPath: (relativePath) => ipcRenderer.invoke('huanding:reveal-path', relativePath),
  getContext: () => ipcRenderer.invoke('huanding:get-context'),
  showHome: () => ipcRenderer.invoke('huanding:show-home'),
  onContextChanged: (callback) => subscribe('huanding:context-changed', callback),
  onStatus: (callback) => subscribe('huanding:status', callback),
  onBeforeLeave: (callback) => {
    leaveHandlers.add(callback);
    return () => leaveHandlers.delete(callback);
  },
});
