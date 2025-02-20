const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { readDatabase, writeDatabase } = require('./storage');

let mainWindow = null;
let appData = null;

async function loadInitialData() {
  try {
    console.log('Cargando datos iniciales...');
    appData = await readDatabase();
    console.log('Datos cargados:', {
      personas: appData.personas.length,
      items: appData.items.length,
      fiados: appData.fiados.length
    });
    return true;
  } catch (error) {
    console.error('Error al cargar datos iniciales:', error);
    throw error;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    backgroundColor: '#FFFFFF',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Cargar el archivo HTML
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  
  // Abrir DevTools en desarrollo
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Esperar a que la app esté lista antes de crear la ventana
app.whenReady().then(async () => {
  try {
    console.log('Aplicación lista, inicializando...');
    createWindow();
    
    // Configurar manejadores IPC después de que la app esté lista
    ipcMain.handle('get-database', async () => {
      console.log('Solicitud de lectura de base de datos recibida');
      try {
        if (!appData) {
          appData = await readDatabase();
        }
        return appData;
      } catch (error) {
        console.error('Error al leer la base de datos:', error);
        throw error;
      }
    });

    ipcMain.handle('add-person', async (event, person) => {
      try {
        if (!appData) {
          appData = await readDatabase();
        }
        const newPerson = { 
          id: (appData.personas.length + 1), 
          ...person 
        };
        appData.personas.push(newPerson);
        await writeDatabase(appData);
        return newPerson;
      } catch (error) {
        console.error('Error al agregar persona:', error);
        throw error;
      }
    });

    ipcMain.handle('add-item', async (event, item) => {
      try {
        if (!appData) {
          appData = await readDatabase();
        }
        const newItem = { 
          id: appData.items.length + 1, 
          ...item 
        };
        appData.items.push(newItem);
        await writeDatabase(appData);
        return newItem;
      } catch (error) {
        console.error('Error al agregar item:', error);
        throw error;
      }
    });

    ipcMain.handle('add-fiado', async (event, fiado) => {
      try {
        if (!appData) {
          appData = await readDatabase();
        }
        const newFiado = { 
          id: appData.fiados.length + 1,
          ...fiado 
        };
        appData.fiados.push(newFiado);
        await writeDatabase(appData);
        return newFiado;
      } catch (error) {
        console.error('Error al agregar fiado:', error);
        throw error;
      }
    });

    ipcMain.handle('update-database', async (event, data) => {
      try {
        await writeDatabase(data);
        appData = data;
        return true;
      } catch (error) {
        console.error('Error al actualizar base de datos:', error);
        throw error;
      }
    });
    
    // Agregar el manejador de focus-fix
    ipcMain.on('focus-fix', () => {
      if (mainWindow) {
        mainWindow.blur();
        mainWindow.focus();
      }
    });

    ipcMain.handle('show-message-box', async (event, options) => {
      try {
        const result = await dialog.showMessageBox(mainWindow, {
          type: options.type || 'info',
          title: options.title || 'Control de Fiados',
          message: options.message,
          buttons: options.buttons || ['OK'],
          defaultId: options.defaultId || 0
        });
        return result;
      } catch (error) {
        console.error('Error al mostrar diálogo:', error);
        throw error;
      }
    });
    
  } catch (error) {
    console.error('Error durante la inicialización:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
