/**
 * Main Entry Point - Electron + Agent Server
 * 
 * Starts the agent backend and the Electron UI
 */

import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { AgentLoop } from "./agent/loop.js";
import { UIServer } from "./ui/server.js";

let mainWindow: BrowserWindow | null = null;
let agentLoop: AgentLoop | null = null;
let uiServer: UIServer | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false, // Custom titlebar
    titleBarStyle: "hidden",
    backgroundColor: "#0d1117",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "ui", "preload.js"),
    },
    icon: path.join(__dirname, "..", "assets", "icon.png"),
  });

  // Start UI server
  uiServer = new UIServer(3847);
  await uiServer.start();

  // Load the UI
  mainWindow.loadURL("http://localhost:3847");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function startAgent() {
  agentLoop = new AgentLoop({
    loopIntervalMs: 30000,
    maxConsecutiveErrors: 5,
  });

  // Forward agent events to UI server
  agentLoop.on("event", (event) => uiServer?.broadcast("agent:event", event));
  agentLoop.on("thought", (thought) => uiServer?.broadcast("agent:thought", thought));
  agentLoop.on("thinking", (data) => uiServer?.broadcast("agent:thinking", data));
  agentLoop.on("executing", (data) => uiServer?.broadcast("agent:executing", data));
  agentLoop.on("wallet", (data) => uiServer?.broadcast("agent:wallet", data));

  await agentLoop.start();
}

// IPC handlers for UI
ipcMain.handle("agent:getState", () => agentLoop?.getState());
ipcMain.handle("agent:getThoughts", (_, count) => agentLoop?.getRecentThoughts(count));
ipcMain.handle("agent:start", () => agentLoop?.start());
ipcMain.handle("agent:stop", () => agentLoop?.stop());
ipcMain.handle("window:minimize", () => mainWindow?.minimize());
ipcMain.handle("window:maximize", () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle("window:close", () => mainWindow?.close());

app.whenReady().then(async () => {
  await createWindow();
  await startAgent();
});

app.on("window-all-closed", () => {
  agentLoop?.stop();
  uiServer?.stop();
  app.quit();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
