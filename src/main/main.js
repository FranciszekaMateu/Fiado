const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { readDatabase, writeDatabase } = require('./storage');
const fs = require('fs');
const PDFDocument = require('pdfkit');

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

    ipcMain.handle('generate-pdf', async (event, data) => {
      try {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
          title: 'Guardar Factura PDF',
          defaultPath: path.join(app.getPath('documents'), `factura_${data.cliente.nombre}_${data.fecha}.pdf`),
          filters: [
            { name: 'PDF', extensions: ['pdf'] }
          ]
        });

        if (canceled || !filePath) {
          return null;
        }

        // Crear nuevo documento PDF
        const doc = new PDFDocument();
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Configurar fuente y tamaños
        doc.font('Helvetica-Bold');
        
        // Encabezado
        doc.fontSize(20)
           .text('FACTURA DE PAGOS PENDIENTES', { align: 'center' })
           .moveDown();

        // Línea separadora
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke()
           .moveDown();

        // Información del cliente
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('INFORMACIÓN DEL CLIENTE')
           .moveDown(0.5)
           .font('Helvetica')
           .text(`Nombre: ${data.cliente.nombre}`)
           .text(`Teléfono: ${data.cliente.telefono}`)
           .text(`Fecha de emisión: ${data.fecha}`)
           .text(`Hora: ${data.hora}`)
           .moveDown();

        // Línea separadora
        doc.moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke()
           .moveDown();

        // Detalle de compras
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .text('DETALLE DE COMPRAS PENDIENTES')
           .moveDown();

        // Iterar sobre cada grupo de fecha
        data.comprasPorFecha.forEach(grupo => {
          doc.font('Helvetica-Bold')
             .text(`Fecha: ${grupo.fecha}`)
             .moveDown(0.5);

          // Encabezados de columna
          doc.font('Helvetica')
             .text('Descripción', 50, doc.y, { width: 250 })
             .text('Hora', 300, doc.y, { width: 100 })
             .text('Precio', 400, doc.y, { width: 100, align: 'right' })
             .moveDown();

          // Items del grupo
          grupo.items.forEach(item => {
            const y = doc.y;
            doc.text(item.descripcion, 50, y, { width: 250 })
               .text(item.hora, 300, y, { width: 100 })
               .text(`$${item.precio.toFixed(2)}`, 400, y, { width: 100, align: 'right' });
            doc.moveDown();
          });

          // Subtotal del grupo
          doc.moveDown()
             .font('Helvetica-Bold')
             .text(`Total del día: $${grupo.total.toFixed(2)}`, { align: 'right' })
             .moveDown();

          // Línea separadora
          doc.moveTo(50, doc.y)
             .lineTo(550, doc.y)
             .stroke()
             .moveDown();
        });

        // Total general
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .text(`TOTAL GENERAL A PAGAR: $${data.totalGeneral.toFixed(2)}`, { align: 'right' })
           .moveDown();

        // Finalizar el documento
        doc.end();

        // Esperar a que el archivo se escriba completamente
        return new Promise((resolve, reject) => {
          writeStream.on('finish', () => resolve(filePath));
          writeStream.on('error', reject);
        });

      } catch (error) {
        console.error('Error al generar PDF:', error);
        throw error;
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
