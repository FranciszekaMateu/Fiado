const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  getDatabase: async () => {
    console.log('Solicitando base de datos...');
    try {
      const result = await ipcRenderer.invoke('get-database');
      console.log('Base de datos recibida:', {
        personas: result.personas.length,
        items: result.items.length,
        fiados: result.fiados.length
      });
      return result;
    } catch (error) {
      console.error('Error al obtener base de datos:', error);
      throw error;
    }
  },
  
  addPerson: async (person) => {
    console.log('Enviando solicitud para agregar persona:', person);
    try {
      const result = await ipcRenderer.invoke('add-person', person);
      console.log('Persona agregada:', result);
      return result;
    } catch (error) {
      console.error('Error al agregar persona:', error);
      throw error;
    }
  },
  
  addItem: async (item) => {
    console.log('Enviando solicitud para agregar item:', item);
    try {
      const result = await ipcRenderer.invoke('add-item', item);
      console.log('Item agregado:', result);
      return result;
    } catch (error) {
      console.error('Error al agregar item:', error);
      throw error;
    }
  },
  
  addFiado: async (fiado) => {
    console.log('Enviando solicitud para agregar fiado:', fiado);
    try {
      const result = await ipcRenderer.invoke('add-fiado', fiado);
      console.log('Fiado agregado:', result);
      return result;
    } catch (error) {
      console.error('Error al agregar fiado:', error);
      throw error;
    }
  },
  
  updateDatabase: async (data) => {
    console.log('Enviando solicitud para actualizar base de datos');
    try {
      const result = await ipcRenderer.invoke('update-database', data);
      console.log('Base de datos actualizada:', result);
      return result;
    } catch (error) {
      console.error('Error al actualizar base de datos:', error);
      throw error;
    }
  },
  
  generatePDF: async (data) => {
    console.log('Enviando solicitud para generar PDF');
    try {
      const result = await ipcRenderer.invoke('generate-pdf', data);
      console.log('PDF generado:', result);
      return result;
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  },
  
  reloadWindow: () => {
    console.log('Solicitando recarga de ventana');
    ipcRenderer.send('reload-window');
  }
});

