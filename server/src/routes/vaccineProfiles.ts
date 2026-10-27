import { Router } from "express";
import { db } from "../db/index.js";
import { isValidAccountId } from "../hash.js";
import { todayStr } from "../dateUtils.js";
import type { VaccineProfileRow, VaccineProfileType } from "../types.js";

export const vaccineProfilesRouter = Router();

const VALID_TYPES: VaccineProfileType[] = ["baby", "male", "female", "cat", "dog"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ProfileBody {
  account?: string;
  name?: string;
  profileType?: VaccineProfileType;
  reminderEmails?: string[];
}

function validateProfileBody(body: ProfileBody): string | null {
  if (!isValidAccountId(body.account)) return "Thiếu hoặc sai tài khoản";
  if (!body.name || !body.name.trim()) return "Thiếu tên sổ tiêm chủng";
  if (!body.profileType || !VALID_TYPES.includes(body.profileType)) return "Thiếu hoặc sai loại sổ tiêm chủng";
  if (body.reminderEmails != null) {
    if (!Array.isArray(body.reminderEmails)) return "Danh sách email không hợp lệ";
    for (const email of body.reminderEmails) {
      if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
        return `Email không hợp lệ: ${email}`;
      }
    }
  }
  return null;
}

function normalizeEmails(emails: string[] | undefined): string | null {
  if (!emails || emails.length === 0) return null;
  const cleaned = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  return cleaned.length > 0 ? JSON.stringify(cleaned) : null;
}

function mapProfile(p: VaccineProfileRow) {
  return {
    id: p.id,
    account: p.account,
    name: p.name,
    profileType: p.profile_type,
    reminderEmails: p.reminder_emails ? (JSON.parse(p.reminder_emails) as string[]) : [],
    sortOrder: p.sort_order,
    createdAt: p.created_at,
  };
}

export function getProfileForAccount(id: number, account: string): VaccineProfileRow | undefined {
  return db.prepare("SELECT * FROM vaccine_profiles WHERE id = ? AND account = ?").get(id, account) as
    | VaccineProfileRow
    | undefined;
}

// Quá hạn nếu: có mũi "dự kiến" (planned) với ngày <= hôm nay, HOẶC vắc-xin không có
// mũi dự kiến nào nhưng next_dose_date (đặt tay) đã <= hôm nay — khớp logic getNextDue
// bên vaccines.ts (mũi dự kiến luôn được ưu tiên hơn next_dose_date).
function profileHasOverdueDose(profileId: number): boolean {
  const today = todayStr();
  const overduePlanned = db
    .prepare(
      `SELECT 1 FROM vaccine_doses d
       JOIN vaccines v ON v.id = d.vaccine_id
       WHERE v.profile_id = ? AND d.planned = 1 AND d.date <= ?
       LIMIT 1`
    )
    .get(profileId, today);
  if (overduePlanned) return true;
  const overdueNextDate = db
    .prepare(
      `SELECT 1 FROM vaccines v
       WHERE v.profile_id = ? AND v.next_dose_date IS NOT NULL AND v.next_dose_date <= ?
       AND NOT EXISTS (SELECT 1 FROM vaccine_doses d WHERE d.vaccine_id = v.id AND d.planned = 1)
       LIMIT 1`
    )
    .get(profileId, today);
  return !!overdueNextDate;
}

vaccineProfilesRouter.get("/", (req, res) => {
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  const rows = db
    .prepare("SELECT * FROM vaccine_profiles WHERE account = ? ORDER BY sort_order ASC")
    .all(account) as unknown as VaccineProfileRow[];
  res.json(rows.map((p) => ({ ...mapProfile(p), hasOverdueDose: profileHasOverdueDose(p.id) })));
});

vaccineProfilesRouter.post("/", (req, res) => {
  const body = req.body as ProfileBody;
  const error = validateProfileBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM vaccine_profiles WHERE account = ?")
    .get(body.account as string) as unknown as { m: number };
  const result = db
    .prepare(
      `INSERT INTO vaccine_profiles (account, name, profile_type, reminder_emails, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.account as string,
      body.name!.trim(),
      body.profileType as string,
      normalizeEmails(body.reminderEmails),
      maxOrder.m + 1,
      new Date().toISOString()
    );
  const profile = db.prepare("SELECT * FROM vaccine_profiles WHERE id = ?").get(result.lastInsertRowid) as unknown as
    VaccineProfileRow;
  res.status(201).json(mapProfile(profile));
});

vaccineProfilesRouter.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as ProfileBody;
  const error = validateProfileBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const existing = getProfileForAccount(id, body.account as string);
  if (!existing) {
    res.status(404).json({ error: "Không tìm thấy sổ tiêm chủng" });
    return;
  }
  db.prepare("UPDATE vaccine_profiles SET name = ?, profile_type = ?, reminder_emails = ? WHERE id = ?").run(
    body.name!.trim(),
    body.profileType as string,
    normalizeEmails(body.reminderEmails),
    id
  );
  const profile = db.prepare("SELECT * FROM vaccine_profiles WHERE id = ?").get(id) as unknown as VaccineProfileRow;
  res.json(mapProfile(profile));
});

vaccineProfilesRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  const existing = getProfileForAccount(id, account);
  if (!existing) {
    res.status(404).json({ error: "Không tìm thấy sổ tiêm chủng" });
    return;
  }
  const vaccineIds = db.prepare("SELECT id FROM vaccines WHERE profile_id = ?").all(id) as { id: number }[];
  for (const v of vaccineIds) {
    db.prepare("DELETE FROM vaccine_doses WHERE vaccine_id = ?").run(v.id);
  }
  db.prepare("DELETE FROM vaccines WHERE profile_id = ?").run(id);
  db.prepare("DELETE FROM vaccine_profiles WHERE id = ?").run(id);
  res.status(204).end();
});
