/**
 * Preload script for Electron - bridges main and renderer
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("automaton", {
  getState: () => ipcRenderer.invoke("agent:getState"),
  getThoughts: (count?: number) => ipcRenderer.invoke("agent:getThoughts", count),
  start: () => ipcRenderer.invoke("agent:start"),
  stop: () => ipcRenderer.invoke("agent:stop"),
  window: {
    minimize: () => ipcRenderer.invoke("window:minimize"),
    maximize: () => ipcRenderer.invoke("window:maximize"),
    close: () => ipcRenderer.invoke("window:close"),
  },
});
