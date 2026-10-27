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
  if (!existingAccountColumns.includes("is_premium")) {
    db.exec(`ALTER TABLE accounts ADD COLUMN is_premium INTEGER NOT NULL DEFAULT 0`);
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
  amount: "TEXT",
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

{
  const existingVaccineColumns = db
    .prepare("PRAGMA table_info(vaccines)")
    .all()
    .map((row: any) => row.name as string);
  if (!existingVaccineColumns.includes("duration_years")) {
    db.exec(`ALTER TABLE vaccines ADD COLUMN duration_years INTEGER`);
  }
  if (!existingVaccineColumns.includes("note")) {
    db.exec(`ALTER TABLE vaccines ADD COLUMN note TEXT`);
  }
  if (!existingVaccineColumns.includes("followed")) {
    db.exec(`ALTER TABLE vaccines ADD COLUMN followed INTEGER NOT NULL DEFAULT 1`);
  }
}

db.exec(`CREATE INDEX IF NOT EXISTS idx_vaccines_account ON vaccines(account)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS vaccine_doses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vaccine_id INTEGER NOT NULL,
    dose_number INTEGER NOT NULL,
    location TEXT,
    date TEXT NOT NULL,
    note TEXT,
    planned INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )
`);

{
  const existingDoseColumns = db
    .prepare("PRAGMA table_info(vaccine_doses)")
    .all()
    .map((row: any) => row.name as string);
  if (!existingDoseColumns.includes("planned")) {
    db.exec(`ALTER TABLE vaccine_doses ADD COLUMN planned INTEGER NOT NULL DEFAULT 0`);
  }
}

db.exec(`CREATE INDEX IF NOT EXISTS idx_vaccine_doses_vaccine_id ON vaccine_doses(vaccine_id)`);

// Một account có thể quản lý nhiều "sổ tiêm chủng" (nhiều người/pet khác nhau) —
// mỗi sổ là 1 vaccine_profiles row, vaccines được gán vào 1 profile qua profile_id.
db.exec(`
  CREATE TABLE IF NOT EXISTS vaccine_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account TEXT NOT NULL,
    name TEXT NOT NULL,
    profile_type TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_vaccine_profiles_account ON vaccine_profiles(account)`);

{
  const existingProfileColumns = db
    .prepare("PRAGMA table_info(vaccine_profiles)")
    .all()
    .map((row: any) => row.name as string);
  if (!existingProfileColumns.includes("reminder_emails")) {
    db.exec(`ALTER TABLE vaccine_profiles ADD COLUMN reminder_emails TEXT`);
  }
}

{
  const existingVaccineColumns2 = db
    .prepare("PRAGMA table_info(vaccines)")
    .all()
    .map((row: any) => row.name as string);
  if (!existingVaccineColumns2.includes("profile_id")) {
    db.exec(`ALTER TABLE vaccines ADD COLUMN profile_id INTEGER`);
  }
}

// Vắc-xin tạo trước khi có khái niệm "sổ tiêm chủng" (nhiều sổ/account) đều thuộc
// về 1 sổ mặc định (loại "baby", tên lấy theo baby_name) — gán profile_id cho các
// vắc-xin cũ chưa có profile. Idempotent: chỉ ảnh hưởng vaccine còn NULL profile_id.
function backfillVaccineProfiles() {
  const orphanAccounts = db
    .prepare("SELECT DISTINCT account FROM vaccines WHERE profile_id IS NULL")
    .all() as { account: string }[];
  for (const { account } of orphanAccounts) {
    let profile = db
      .prepare("SELECT id FROM vaccine_profiles WHERE account = ? ORDER BY sort_order ASC LIMIT 1")
      .get(account) as { id: number } | undefined;
    if (!profile) {
      const accountRow = db.prepare("SELECT baby_name FROM accounts WHERE id = ?").get(account) as
        | { baby_name: string }
        | undefined;
      const result = db
        .prepare(
          `INSERT INTO vaccine_profiles (account, name, profile_type, sort_order, created_at) VALUES (?, ?, 'baby', 0, ?)`
        )
        .run(account, accountRow?.baby_name ?? account, new Date().toISOString());
      profile = { id: result.lastInsertRowid as number };
    }
    db.prepare("UPDATE vaccines SET profile_id = ? WHERE account = ? AND profile_id IS NULL").run(
      profile.id,
      account
    );
  }
}

backfillVaccineProfiles();

db.exec(`CREATE INDEX IF NOT EXISTS idx_vaccines_profile_id ON vaccines(profile_id)`);

// Cờ bật/tắt từng chức năng ở trang chủ — admin tắt thì ẩn khỏi mọi tài khoản.
db.exec(`
  CREATE TABLE IF NOT EXISTS feature_flags (
    key TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1
  )
`);

function seedFeatureFlag(key: string) {
  const existing = db.prepare("SELECT key FROM feature_flags WHERE key = ?").get(key);
  if (!existing) {
    db.prepare("INSERT INTO feature_flags (key, enabled) VALUES (?, 1)").run(key);
  }
}

// "Note Thông Tin" và "Xem Thống Kê" luôn hiển thị cùng nhau trên trang chủ nên
// gộp chung 1 cờ NOTE_STATS — dọn 2 khóa tách rời cũ (nếu còn sót từ bản trước).
db.prepare("DELETE FROM feature_flags WHERE key IN ('NOTE', 'STATS')").run();

for (const key of ["NOTE_STATS", "VACCINE", "DIARY", "GROWTH"]) {
  seedFeatureFlag(key);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS diary_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account TEXT NOT NULL,
    entry_date TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_diary_entries_account ON diary_entries(account)`);

{
  const existingDiaryColumns = db
    .prepare("PRAGMA table_info(diary_entries)")
    .all()
    .map((row: any) => row.name as string);
  if (!existingDiaryColumns.includes("importance")) {
    db.exec(`ALTER TABLE diary_entries ADD COLUMN importance TEXT`);
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS drive_uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account TEXT NOT NULL,
    full_file_id TEXT NOT NULL,
    full_url TEXT NOT NULL,
    thumb_file_id TEXT NOT NULL,
    thumb_url TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    created_at TEXT NOT NULL
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_drive_uploads_account ON drive_uploads(account)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS diary_photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    diary_entry_id INTEGER NOT NULL,
    drive_upload_id INTEGER NOT NULL,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_diary_photos_entry ON diary_photos(diary_entry_id)`);

// Chỉ ghi các lỗi 5xx/không mong đợi (xem errorLog.ts) — không ghi lỗi validate 4xx
// thường xuyên (sai PIN, thiếu field...) để tránh phình bảng vô ích.
db.exec(`
  CREATE TABLE IF NOT EXISTS error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    route TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    message TEXT NOT NULL,
    account TEXT
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at)`);

// Audit trail of state-changing actions (see usageLog.ts) — separate from error_logs
// since it tracks normal usage, not failures, and has a much shorter retention.
db.exec(`
  CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    route TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    account TEXT
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS thawed_milk (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account TEXT NOT NULL,
    storage_date TEXT,
    taken_out_at TEXT NOT NULL,
    expiry_hours REAL NOT NULL,
    expiry_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_thawed_milk_account ON thawed_milk(account)`);

db.exec(`
  CREATE TABLE IF NOT EXISTS growth_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account TEXT NOT NULL,
    date TEXT NOT NULL,
    milestone_label TEXT,
    height_cm REAL,
    weight_kg REAL,
    created_at TEXT NOT NULL
  )
`);

db.exec(`CREATE INDEX IF NOT EXISTS idx_growth_records_account ON growth_records(account)`);
