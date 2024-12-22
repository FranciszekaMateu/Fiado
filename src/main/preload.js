const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('api', {
  getDatabase: () => {
    const dbPath = path.join(__dirname, '..', 'data', 'database.json');
    try {
      return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } catch (error) {
      console.error('Error al leer el archivo de base de datos:', error);
      throw error; 
    }
  },
  addPerson: (person) => ipcRenderer.invoke('add-person', person),
  addItem: (item) => ipcRenderer.invoke('add-item', item),
  addFiado: (fiado) => ipcRenderer.invoke('add-fiado', fiado),
  updateDatabase: async (data) => {
    const dbPath = path.join(__dirname,'..', 'data', 'database.json');
    try {
      fs.writeFileSync(dbPath, JSON.stringify(data, null, 2)); 
    } catch (error) {
      console.error('Error al escribir en el archivo de base de datos:', error);
      throw error; 
    }
  },
  generatePDF: (data) => ipcRenderer.invoke('generate-pdf', data),
  reloadWindow: () => ipcRenderer.send('reload-window'),
});

