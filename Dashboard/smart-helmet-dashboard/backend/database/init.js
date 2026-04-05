import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '..', 'helmet.db');

let SQL;
let db;

async function initSqlJsDb() {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  // Try to load existing database file
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create miners table
  db.run(`
    CREATE TABLE IF NOT EXISTS miners (
      miner_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contact_info TEXT,
      health_profile TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create sensors table
  db.run(`
    CREATE TABLE IF NOT EXISTS sensors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      miner_id TEXT NOT NULL,
      oxygen REAL,
      co2 REAL,
      co REAL,
      ch4 REAL,
      h2s REAL,
      heart_rate REAL,
      temperature REAL,
      humidity REAL,
      obstacle_distance REAL,
      latitude REAL,
      longitude REAL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (miner_id) REFERENCES miners(miner_id)
    )
  `);

  // Create alerts table
  db.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      miner_id TEXT NOT NULL,
      level TEXT NOT NULL CHECK(level IN ('warning', 'danger')),
      message TEXT NOT NULL,
      sensor_type TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (miner_id) REFERENCES miners(miner_id)
    )
  `);

  // Create sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      session_id TEXT PRIMARY KEY,
      miner_id TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      location_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (miner_id) REFERENCES miners(miner_id)
    )
  `);

  // Create rescue missions table
  db.run(`
    CREATE TABLE IF NOT EXISTS rescue_missions (
      mission_id TEXT PRIMARY KEY,
      miner_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      oxygen_level REAL,
      co2_level REAL,
      co_level REAL,
      ch4_level REAL,
      h2s_level REAL,
      heart_rate REAL,
      gas_hazard_level TEXT,
      status TEXT CHECK(status IN ('pending', 'in_progress', 'resolved', 'cancelled')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (miner_id) REFERENCES miners(miner_id)
    )
  `);

  // Seed default miner if not exists
  const result = db.exec('SELECT * FROM miners WHERE miner_id = "MINER-001"');
  if (!result || result.length === 0 || result[0].values.length === 0) {
    db.run(
      'INSERT INTO miners (miner_id, name, contact_info, health_profile) VALUES (?, ?, ?, ?)',
      ['MINER-001', 'Default Miner', '', '']
    );
  }

  // Save database to file
  saveDatabase();

  console.log(`Database initialized at: ${DB_PATH}`);
  return db;
}

export function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

export async function initializeDatabase() {
  return await initSqlJsDb();
}

export function getDatabase() {
  return db;
}

