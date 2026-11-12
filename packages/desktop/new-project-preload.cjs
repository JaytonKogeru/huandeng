const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('newProject', {
  settings: () => ipcRenderer.invoke('huandeng:new-project-settings'),
  location: (name) => ipcRenderer.invoke('huandeng:new-project-location', name),
  browse: () => ipcRenderer.invoke('huandeng:new-project-browse'),
  create: (request) => ipcRenderer.invoke('huandeng:new-project-create', request),
  cancel: () => ipcRenderer.invoke('huandeng:new-project-cancel'),
});
