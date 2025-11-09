import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Подключаем sql.js
const SQL = await initSqlJs({
  locateFile: () => path.join(__dirname, 'sql-wasm.wasm')
});

const DB_FILE = process.env.DB_PATH || './app.db';
let db;

export async function initDB() {
  const SQL = await initSqlJs({ locateFile: file => `https://sql.js.org/dist/${file}` });

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
    const initSQL = fs.readFileSync(path.join(process.cwd(), 'init.sql'), 'utf8');
    db.run(initSQL);
    saveDb();
  }

  return db;
}

export function getDB() {
  if (!db) throw new Error('Database not initialized. Call initDB() first.');
  return db;
}

export function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

export function queryAll(sql, params=[]) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while(stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function queryOne(sql, params=[]) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let row = null;
  if(stmt.step()) row = stmt.getAsObject();
  stmt.free();
  return row;
}