const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let dbPath;
if (isDev) {
  dbPath = path.join(__dirname, '../data/database.json');
} else {
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'database.json');
}

const initialDB = {
  personas: [],
  items: [],
  fiados: []
};

function readDatabase() {
  try {
    if (!isDev) {
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
    } else {
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }

    if (!fs.existsSync(dbPath)) {
      fs.writeFileSync(dbPath, JSON.stringify(initialDB, null, 2));
      return initialDB;
    }

    const data = fs.readFileSync(dbPath, 'utf8');
    
    if (!data.trim()) {
      fs.writeFileSync(dbPath, JSON.stringify(initialDB, null, 2));
      return initialDB;
    }

    try {
      const db = JSON.parse(data);
      if (!db.personas || !db.items || !db.fiados) {
        throw new Error('Estructura de base de datos inválida');
      }
      return db;
    } catch (parseError) {
      console.error('Error al parsear la base de datos:', parseError);
      fs.writeFileSync(dbPath, JSON.stringify(initialDB, null, 2));
      return initialDB;
    }
  } catch (error) {
    console.error('Error al leer la base de datos:', error);
    return initialDB;
  }
}

function writeDatabase(data) {
  try {
    if (!isDev) {
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
    } else {
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }

    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error al escribir en la base de datos:', error);
    throw error;
  }
}

module.exports = { readDatabase, writeDatabase };
