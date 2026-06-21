import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashPin, randomToken } from "../hash.js";

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

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    baby_name TEXT NOT NULL,
    pin_hash TEXT NOT NULL,
    session_token TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )
`);

{
  const existingAccountColumns = db
    .prepare("PRAGMA table_info(accounts)")
    .all()
    .map((row: any) => row.name as string);
  if (!existingAccountColumns.includes("is_active")) {
    db.exec(`ALTER TABLE accounts ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`);
  }
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
  account: "TEXT",
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

db.exec(`CREATE INDEX IF NOT EXISTS idx_records_account ON records(account)`);

// Dữ liệu tạo trước khi có khái niệm account đều thuộc về 1 em bé duy nhất
// đang dùng app (laclac) — gán account cho các bản ghi cũ chưa có account.
// Idempotent: chỉ ảnh hưởng các dòng còn NULL, chạy lại không gây thay đổi gì thêm.
db.exec(`UPDATE records SET account = 'laclac' WHERE account IS NULL`);

function seedAccount(id: string, babyName: string, pin: string, isAdmin: boolean) {
  const existing = db.prepare("SELECT id FROM accounts WHERE id = ?").get(id);
  if (existing) return;
  db.prepare(
    `INSERT INTO accounts (id, baby_name, pin_hash, session_token, is_admin, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, babyName, hashPin(pin), randomToken(), isAdmin ? 1 : 0, new Date().toISOString());
}

seedAccount("laclac", "Lạc Lạc", "1111", false);
seedAccount("admin", "Admin", "7556", true);

db.exec(`
  CREATE TABLE IF NOT EXISTS vaccines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account TEXT NOT NULL,
    disease_name TEXT NOT NULL,
    vaccine_name TEXT NOT NULL,
    total_doses INTEGER,
    duration_type TEXT NOT NULL,
    expiry_month INTEGER,
    expiry_year INTEGER,
    next_dose_date TEXT,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_vaccines_account ON vaccines(account)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS vaccine_doses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vaccine_id INTEGER NOT NULL,
    dose_number INTEGER NOT NULL,
    location TEXT,
    date TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_vaccine_doses_vaccine_id ON vaccine_doses(vaccine_id)`);
