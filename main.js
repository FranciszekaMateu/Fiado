const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');

  ipcMain.on('reload-window', () => {
    mainWindow.webContents.reloadIgnoringCache();
  });
}

app.whenReady().then(createWindow); 