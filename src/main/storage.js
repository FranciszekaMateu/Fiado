const fs = require('fs');
const path = require('path');
const { app } = require('electron');

// Determinar la ruta de la base de datos según el entorno y sistema operativo
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const isLinux = process.platform === 'linux';

// En desarrollo en Linux, usar @database.json en la raíz del proyecto
// En otros casos, usar el directorio de datos del usuario
const dbPath = isDev && isLinux
  ? path.join(process.cwd(), 'data', 'database.json')
  : path.join(app.getPath('userData'), 'database.json');

console.log('Configuración de base de datos:', {
  desarrollo: isDev,
  linux: isLinux,
  ruta: dbPath
});

// Estructura inicial de la base de datos
const initialDb = {
  personas: [],
  items: [],
  fiados: []
};

function initializeDatabase() {
  try {
    // Crear el directorio data si no existe
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      console.log('Creando directorio de datos en:', dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Si el archivo no existe, crearlo con la estructura inicial
    if (!fs.existsSync(dbPath)) {
      console.log('Creando nuevo archivo de base de datos en:', dbPath);
      fs.writeFileSync(dbPath, JSON.stringify(initialDb, null, 2), 'utf8');
      console.log('Base de datos inicializada correctamente');
    }
    
    // Verificar permisos de lectura/escritura
    fs.accessSync(dbPath, fs.constants.R_OK | fs.constants.W_OK);
    console.log('Permisos de lectura/escritura verificados para:', dbPath);
    return true;
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
}

function readDatabase() {
  try {
    console.log('Leyendo base de datos desde:', dbPath);
    
    // Asegurar que la base de datos existe
    if (!fs.existsSync(dbPath)) {
      console.log('Base de datos no encontrada, inicializando...');
      initializeDatabase();
    }
    
    // Leer el archivo
    const data = fs.readFileSync(dbPath, 'utf8');
    console.log('Datos leídos:', data.length, 'bytes');
    
    // Intentar parsear el JSON
    const parsed = JSON.parse(data);
    
    // Verificar estructura
    if (!parsed.personas || !parsed.items || !parsed.fiados) {
      console.error('Estructura de base de datos inválida');
      throw new Error('Estructura de base de datos inválida');
    }
    
    return parsed;
  } catch (error) {
    console.error('Error al leer la base de datos:', error);
    
    // Si hay error de parsing, intentar recuperar
    if (error instanceof SyntaxError) {
      console.log('Error de parsing, intentando recuperar...');
      initializeDatabase();
      return initialDb;
    }
    
    throw error;
  }
}

function writeDatabase(data) {
  try {
    console.log('Iniciando escritura en base de datos:', dbPath);
    
    // Verificar que el directorio existe
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      console.log('Creando directorio:', dataDir);
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Verificar estructura
    if (!data || !data.personas || !data.items || !data.fiados) {
      console.error('Intento de escribir datos inválidos:', data);
      throw new Error('Estructura de datos inválida');
    }
    
    // Crear backup antes de escribir
    const backupPath = `${dbPath}.backup`;
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);
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
    
    // Escribir datos de forma síncrona
    fs.writeFileSync(dbPath, jsonData, { encoding: 'utf8', flag: 'w' });
    console.log('Datos escritos en el archivo');
    
    // Verificar que se escribió correctamente
    const verification = fs.readFileSync(dbPath, 'utf8');
    if (verification !== jsonData) {
      throw new Error('Verificación de escritura falló');
    }
    
    // Verificar que se puede leer y parsear
    const parsed = JSON.parse(verification);
    if (!parsed || !parsed.personas || !parsed.items || !parsed.fiados) {
      throw new Error('Verificación de estructura falló');
    }
    
    console.log('Escritura verificada correctamente');
    return true;
  } catch (error) {
    console.error('Error al escribir en la base de datos:', error);
    console.error('Stack:', error.stack);
    
    // Intentar restaurar desde backup si existe
    if (fs.existsSync(`${dbPath}.backup`)) {
      console.log('Intentando restaurar desde backup...');
      fs.copyFileSync(`${dbPath}.backup`, dbPath);
    }
    
    throw error;
  }
}

// Inicializar la base de datos al cargar el módulo
initializeDatabase();

module.exports = {
  readDatabase,
  writeDatabase,
  dbPath
};
