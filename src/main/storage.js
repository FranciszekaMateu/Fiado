const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let dbPath = '';
let isInitialized = false;

// Estructura inicial de la base de datos
const initialDb = {
  personas: [],
  items: [],
  fiados: []
};

function initializePath() {
  if (!app.isReady()) {
    throw new Error('Electron app no está lista');
  }
  
  // Asegurarse de que estamos usando el nombre correcto de la aplicación
  const appName = app.getName();
  dbPath = path.join(app.getPath('userData'), 'database.json');
  
  console.log('Configuración de base de datos:', {
    appName: appName,
    ruta: dbPath,
    userDataPath: app.getPath('userData')
  });
}

async function initializeDatabase() {
  try {
    if (!isInitialized) {
      initializePath();
      isInitialized = true;
    }

    // Crear el directorio si no existe
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      console.log('Creando directorio de datos en:', dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Si el archivo no existe, crearlo con la estructura inicial
    if (!fs.existsSync(dbPath)) {
      console.log('Creando nuevo archivo de base de datos en:', dbPath);
      await fs.promises.writeFile(dbPath, JSON.stringify(initialDb, null, 2), 'utf8');
      console.log('Base de datos inicializada correctamente');
    } else {
      // Verificar que el archivo existente tiene una estructura válida
      try {
        const data = await fs.promises.readFile(dbPath, 'utf8');
        const parsed = JSON.parse(data);
        if (!parsed || !parsed.personas || !parsed.items || !parsed.fiados) {
          console.error('Estructura de base de datos inválida, creando backup y reinicializando');
          const backupPath = `${dbPath}.backup.${Date.now()}`;
          await fs.promises.copyFile(dbPath, backupPath);
          await fs.promises.writeFile(dbPath, JSON.stringify(initialDb, null, 2), 'utf8');
        }
      } catch (error) {
        console.error('Error al validar base de datos existente:', error);
        const backupPath = `${dbPath}.backup.${Date.now()}`;
        if (fs.existsSync(dbPath)) {
          await fs.promises.copyFile(dbPath, backupPath);
        }
        await fs.promises.writeFile(dbPath, JSON.stringify(initialDb, null, 2), 'utf8');
      }
    }

    // Verificar permisos de lectura/escritura
    await fs.promises.access(dbPath, fs.constants.R_OK | fs.constants.W_OK);
    console.log('Permisos de lectura/escritura verificados para:', dbPath);
    
    // Intentar leer el archivo para verificar que todo está bien
    const testRead = await fs.promises.readFile(dbPath, 'utf8');
    const testParse = JSON.parse(testRead);
    console.log('Verificación de lectura exitosa:', {
      personas: testParse.personas.length,
      items: testParse.items.length,
      fiados: testParse.fiados.length
    });
    
    return true;
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
}

async function readDatabase() {
  try {
    if (!isInitialized) {
      await initializeDatabase();
    }

    console.log('Leyendo base de datos desde:', dbPath);
    
    // Leer el archivo
    const data = await fs.promises.readFile(dbPath, 'utf8');
    console.log('Datos leídos:', data.length, 'bytes');
    
    // Intentar parsear el JSON
    const parsed = JSON.parse(data);
    
    // Verificar estructura
    if (!parsed || !parsed.personas || !parsed.items || !parsed.fiados) {
      console.error('Estructura de base de datos inválida');
      throw new Error('Estructura de base de datos inválida');
    }
    
    console.log('Datos leídos correctamente:', {
      personas: parsed.personas.length,
      items: parsed.items.length,
      fiados: parsed.fiados.length
    });
    
    return parsed;
  } catch (error) {
    console.error('Error al leer la base de datos:', error);
    console.error('Stack:', error.stack);
    
    // Si hay error de parsing, intentar recuperar
    if (error instanceof SyntaxError) {
      console.log('Error de parsing, intentando recuperar...');
      await initializeDatabase();
      return initialDb;
    }
    
    throw error;
  }
}

async function writeDatabase(data) {
  try {
    if (!isInitialized) {
      await initializeDatabase();
    }

    console.log('Iniciando escritura en base de datos:', dbPath);
    
    // Verificar estructura
    if (!data || !data.personas || !data.items || !data.fiados) {
      console.error('Intento de escribir datos inválidos:', data);
      throw new Error('Estructura de datos inválida');
    }
    
    // Crear backup antes de escribir
    if (fs.existsSync(dbPath)) {
      const backupPath = `${dbPath}.backup`;
      await fs.promises.copyFile(dbPath, backupPath);
      console.log('Backup creado en:', backupPath);
    }
    
    // Convertir a JSON con formato
    const jsonData = JSON.stringify(data, null, 2);
    console.log('Datos a escribir:', {
      tamaño: jsonData.length,
      personas: data.personas.length,
      items: data.items.length,
      fiados: data.fiados.length
    });
    
    // Escribir datos
    await fs.promises.writeFile(dbPath, jsonData, 'utf8');
    console.log('Datos escritos correctamente');
    
    return true;
  } catch (error) {
    console.error('Error al escribir en la base de datos:', error);
    console.error('Stack:', error.stack);
    throw error;
  }
}

// No inicializar inmediatamente, esperar a que la app esté lista
if (app.isReady()) {
  initializeDatabase().catch(error => {
    console.error('Error al inicializar la base de datos:', error);
  });
} else {
  app.on('ready', () => {
    initializeDatabase().catch(error => {
      console.error('Error al inicializar la base de datos:', error);
    });
  });
}

module.exports = {
  readDatabase,
  writeDatabase,
  initialDb
};
