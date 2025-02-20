const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', {
  getDatabase: async () => {
    console.log('Renderer: Solicitando base de datos...');
    try {
      const result = await ipcRenderer.invoke('get-database');
      console.log('Renderer: Base de datos recibida:', {
        personas: result?.personas?.length || 0,
        items: result?.items?.length || 0,
        fiados: result?.fiados?.length || 0
      });
      return result;
    } catch (error) {
      console.error('Renderer: Error al obtener base de datos:', error);
      throw error;
    }
  },
  
  addPerson: async (person) => {
    console.log('Renderer: Enviando solicitud para agregar persona:', person);
    try {
      const result = await ipcRenderer.invoke('add-person', person);
      console.log('Renderer: Persona agregada:', result);
      return result;
    } catch (error) {
      console.error('Renderer: Error al agregar persona:', error);
      throw error;
    }
  },
  
  addItem: async (item) => {
    console.log('Renderer: Enviando solicitud para agregar item:', item);
    try {
      const result = await ipcRenderer.invoke('add-item', item);
      console.log('Renderer: Item agregado:', result);
      return result;
    } catch (error) {
      console.error('Renderer: Error al agregar item:', error);
      throw error;
    }
  },
  
  addFiado: async (fiado) => {
    console.log('Renderer: Enviando solicitud para agregar fiado:', fiado);
    try {
      const result = await ipcRenderer.invoke('add-fiado', fiado);
      console.log('Renderer: Fiado agregado:', result);
      return result;
    } catch (error) {
      console.error('Renderer: Error al agregar fiado:', error);
      throw error;
    }
  },
  
  updateDatabase: async (data) => {
    console.log('Renderer: Enviando solicitud para actualizar base de datos');
    try {
      const result = await ipcRenderer.invoke('update-database', data);
      console.log('Renderer: Base de datos actualizada');
      return result;
    } catch (error) {
      console.error('Renderer: Error al actualizar base de datos:', error);
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
  },
  
  showMessageBox: async (options) => {
    console.log('Renderer: Solicitando mostrar diálogo:', options);
    try {
      const result = await ipcRenderer.invoke('show-message-box', options);
      console.log('Renderer: Diálogo mostrado:', result);
      return result;
    } catch (error) {
      console.error('Renderer: Error al mostrar diálogo:', error);
      throw error;
    }
  }
});

