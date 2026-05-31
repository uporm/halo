import { app, BrowserWindow } from "electron";
import path from "node:path";
import os from "node:os";

import { disposeActiveSessions, registerAgentIpc } from "./ipc/agent";
import { registerSettingsIpc } from "./ipc/settings";

const isDev = process.env.NODE_ENV === "development";

// 本地开发环境可能无法稳定启用 Chromium 沙箱，这里只在 dev 放宽限制，避免启动期 GPU/沙箱相关崩溃。
if (isDev) {
  const tempAppDir = path.join(os.tmpdir(), "halo-electron-dev");
  app.setPath("userData", tempAppDir);
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disk-cache-dir", path.join(tempAppDir, "cache"));
  app.commandLine.appendSwitch("no-sandbox");
  app.commandLine.appendSwitch("disable-gpu");
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (isDev) {
    await win.loadURL("http://localhost:8000");
    win.webContents.openDevTools();
    return;
  }

  await win.loadFile(path.join(__dirname, "../../dist/index.html"));
}

app.whenReady().then(async () => {
  registerAgentIpc();
  registerSettingsIpc();
  await createWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("before-quit", () => {
  disposeActiveSessions();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
