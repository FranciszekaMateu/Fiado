const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { readDatabase, writeDatabase } = require('./storage');
const { setupPDFGeneration } = require('./ipc');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    backgroundColor: '#FFFFFF',
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false,
      hardwareAcceleration: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
  });
}

app.whenReady().then(() => {
  createWindow();
  setupPDFGeneration();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  mainWindow = null;
});

ipcMain.handle('get-database', () => readDatabase());
ipcMain.handle('add-person', (event, person) => {
  const db = readDatabase();
  const newPerson = { id: db.personas.length + 1, ...person };
  db.personas.push(newPerson);
  writeDatabase(db);
  return newPerson;
});

ipcMain.handle('add-item', (event, item) => {
  const db = readDatabase();
  const newItem = { id: db.items.length + 1, ...item };
  db.items.push(newItem);
  writeDatabase(db);
  return newItem;
});

ipcMain.handle('add-fiado', (event, fiado) => {
  const db = readDatabase();
  const newFiado = { 
    id: db.fiados.length + 1,
    ...fiado 
  };
  db.fiados.push(newFiado);
  writeDatabase(db);
  return newFiado;
});

ipcMain.handle('update-database', (event, data) => {
  writeDatabase(data);
  return true;
});

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
