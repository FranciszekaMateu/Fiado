const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { readDatabase, writeDatabase, dbPath } = require('./storage');
const { setupPDFGeneration } = require('./ipc');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    backgroundColor: '#FFFFFF',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      hardwareAcceleration: true,
      sandbox: true,
      allowRunningInsecureContent: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('Ventana principal mostrada');
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  // Abrir DevTools en desarrollo
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
  });

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' https:; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; " +
          "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://fonts.googleapis.com; " +
          "font-src 'self' https://cdnjs.cloudflare.com https://fonts.gstatic.com; " +
          "img-src 'self' data: https:; " +
          "connect-src 'self' https:;"
        ]
      }
    });
  });

  mainWindow.webContents.on('crashed', () => {
    console.error('La ventana principal se ha bloqueado');
  });

  mainWindow.on('unresponsive', () => {
    console.error('La ventana principal no responde');
  });
}

app.whenReady().then(() => {
  console.log('Aplicación lista, creando ventana principal...');
  console.log('Usando base de datos en:', dbPath);
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

// Manejadores de IPC con mejor logging y manejo de errores
ipcMain.handle('get-database', async () => {
  console.log('Solicitud de lectura de base de datos recibida');
  try {
    const data = readDatabase();
    console.log('Base de datos leída exitosamente:', {
      ruta: dbPath,
      personas: data.personas.length,
      items: data.items.length,
      fiados: data.fiados.length
    });
    return data;
  } catch (error) {
    console.error('Error al leer la base de datos:', error);
    throw error;
  }
});

ipcMain.handle('add-person', async (event, person) => {
  console.log('Solicitud para agregar persona:', person);
  try {
    // Leer base de datos actual
    console.log('Leyendo base de datos actual desde:', dbPath);
    const db = readDatabase();
    console.log('Estado actual de la base de datos:', {
      ruta: dbPath,
      personas: db.personas.length,
      items: db.items.length,
      fiados: db.fiados.length
    });

    // Crear nueva persona
    const newPerson = { 
      id: (db.personas.length + 1), 
      ...person 
    };
    console.log('Nueva persona a agregar:', newPerson);

    // Agregar a la lista
    db.personas.push(newPerson);
    console.log('Persona agregada a la lista en memoria');
    
    // Guardar cambios
    console.log('Intentando escribir en la base de datos:', dbPath);
    const result = await writeDatabase(db);
    
    if (!result) {
      console.error('Error: writeDatabase retornó false');
      throw new Error('Error al escribir en la base de datos');
    }
    
    // Verificar que se guardó
    console.log('Verificando escritura...');
    const verificacion = readDatabase();
    console.log('Verificación después de guardar:', {
      ruta: dbPath,
      totalPersonas: verificacion.personas.length,
      ultimaPersona: verificacion.personas[verificacion.personas.length - 1]
    });

    console.log('Persona agregada exitosamente');
    return newPerson;
  } catch (error) {
    console.error('Error al agregar persona:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
});

ipcMain.handle('add-item', async (event, item) => {
  console.log('Solicitud para agregar item:', item);
  try {
    console.log('Leyendo base de datos desde:', dbPath);
    const db = readDatabase();
    console.log('Estado actual:', {
      ruta: dbPath,
      items: db.items.length
    });

    const newItem = { 
      id: db.items.length + 1, 
      ...item 
    };
    db.items.push(newItem);
    
    console.log('Intentando guardar cambios...');
    const result = await writeDatabase(db);
    if (!result) {
      throw new Error('Error al escribir en la base de datos');
    }
    
    console.log('Item guardado exitosamente');
    return newItem;
  } catch (error) {
    console.error('Error al agregar item:', error);
    throw error;
  }
});

ipcMain.handle('add-fiado', async (event, fiado) => {
  console.log('Solicitud para agregar fiado:', fiado);
  try {
    console.log('Leyendo base de datos desde:', dbPath);
    const db = readDatabase();
    console.log('Estado actual:', {
      ruta: dbPath,
      fiados: db.fiados.length
    });

    const newFiado = { 
      id: db.fiados.length + 1,
      ...fiado 
    };
    db.fiados.push(newFiado);
    
    console.log('Intentando guardar cambios...');
    const result = await writeDatabase(db);
    if (!result) {
      throw new Error('Error al escribir en la base de datos');
    }
    
    console.log('Fiado guardado exitosamente');
    return newFiado;
  } catch (error) {
    console.error('Error al agregar fiado:', error);
    throw error;
  }
});

ipcMain.handle('update-database', async (event, data) => {
  console.log('Solicitud para actualizar base de datos');
  try {
    console.log('Intentando escribir en:', dbPath);
    const result = await writeDatabase(data);
    if (!result) {
      throw new Error('Error al escribir en la base de datos');
    }
    console.log('Base de datos actualizada exitosamente');
    return true;
  } catch (error) {
    console.error('Error al actualizar base de datos:', error);
    throw error;
  }
});

// Deshabilitar aceleración por hardware si hay problemas
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
