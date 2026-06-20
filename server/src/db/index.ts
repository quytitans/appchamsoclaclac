import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPin } from "../hash.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, "..", "..", "database.sqlite");

export const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    side TEXT,
    volume_ml REAL,
    status TEXT,
    weight_kg REAL,
    height_cm REAL,
    custom_name TEXT,
    custom_value TEXT,
    note TEXT,
    created_at TEXT NOT NULL
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_records_date ON records(date)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_records_type ON records(type)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`);

const existingPin = db.prepare("SELECT value FROM settings WHERE key = 'pin_hash'").get();
if (!existingPin) {
  db.prepare("INSERT INTO settings (key, value) VALUES ('pin_hash', ?)").run(hashPin("0000"));
}

// Cơ chế tự kiểm tra & cập nhật cột khi schema thay đổi (không dùng tool migration ngoài).
const REQUIRED_COLUMNS: Record<string, string> = {
  id: "INTEGER",
  type: "TEXT",
  date: "TEXT",
  time: "TEXT",
  side: "TEXT",
  volume_ml: "REAL",
  status: "TEXT",
  weight_kg: "REAL",
  height_cm: "REAL",
  custom_name: "TEXT",
  custom_value: "TEXT",
  note: "TEXT",
  created_at: "TEXT",
};

function syncSchema() {
  const existingColumns = db
    .prepare("PRAGMA table_info(records)")
    .all()
    .map((row: any) => row.name as string);

  for (const [column, type] of Object.entries(REQUIRED_COLUMNS)) {
    if (!existingColumns.includes(column)) {
      db.exec(`ALTER TABLE records ADD COLUMN ${column} ${type}`);
    }
  }
}

syncSchema();
