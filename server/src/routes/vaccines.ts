import { Router } from "express";
import { db } from "../db/index.js";
import { isValidAccountId } from "../hash.js";
import type { VaccineDoseRow, VaccineDurationType, VaccineRow } from "../types.js";

export const vaccinesRouter = Router();

interface VaccineBody {
  account?: string;
  diseaseName?: string;
  vaccineName?: string;
  totalDoses?: number;
  durationType?: VaccineDurationType;
  durationYears?: number;
  nextDoseDate?: string;
  note?: string;
}

function validateVaccineBody(body: VaccineBody): string | null {
  if (!isValidAccountId(body.account)) return "Thiếu hoặc sai tài khoản";
  if (!body.diseaseName || !body.diseaseName.trim()) return "Thiếu tên bệnh/loại bệnh phòng ngừa";
  if (!body.vaccineName || !body.vaccineName.trim()) return "Thiếu tên thương mại vắc-xin";
  if (body.durationType !== "lifetime" && body.durationType !== "limited" && body.durationType !== "yearly") {
    return "Thiếu thời hạn bảo vệ";
  }
  if (body.durationType === "limited") {
    if (typeof body.durationYears !== "number" || body.durationYears < 1) {
      return "Thiếu hoặc sai số năm bảo vệ";
    }
  }
  if (typeof body.totalDoses === "number" && body.totalDoses < 0) return "Tổng số mũi không được âm";
  return null;
}

function getVaccineForAccount(id: number, account: string): VaccineRow | undefined {
  return db.prepare("SELECT * FROM vaccines WHERE id = ? AND account = ?").get(id, account) as
    | VaccineRow
    | undefined;
}

function getDosesSummary(vaccineId: number) {
  const doses = db
    .prepare("SELECT * FROM vaccine_doses WHERE vaccine_id = ? ORDER BY dose_number ASC")
    .all(vaccineId) as unknown as VaccineDoseRow[];
  const latest = doses.length > 0 ? doses[doses.length - 1] : null;
  return { doseCount: doses.length, latestDose: latest };
}

function recalcExpiry(vaccineId: number) {
  const vaccine = db.prepare("SELECT * FROM vaccines WHERE id = ?").get(vaccineId) as
    | VaccineRow
    | undefined;
  if (!vaccine || vaccine.duration_type !== "limited" || vaccine.duration_years == null) return;
  const dose1 = db
    .prepare("SELECT * FROM vaccine_doses WHERE vaccine_id = ? AND dose_number = 1")
    .get(vaccineId) as VaccineDoseRow | undefined;
  if (!dose1) {
    db.prepare("UPDATE vaccines SET expiry_month = NULL, expiry_year = NULL WHERE id = ?").run(vaccineId);
    return;
  }
  const [y, m] = dose1.date.split("-").map(Number);
  db.prepare("UPDATE vaccines SET expiry_month = ?, expiry_year = ? WHERE id = ?").run(
    m,
    y + vaccine.duration_years,
    vaccineId
  );
}

vaccinesRouter.get("/", (req, res) => {
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  const vaccines = db
    .prepare("SELECT * FROM vaccines WHERE account = ? ORDER BY sort_order ASC")
    .all(account) as unknown as VaccineRow[];
  res.json(vaccines.map((v) => ({ ...v, ...getDosesSummary(v.id) })));
});

vaccinesRouter.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  const vaccine = getVaccineForAccount(id, account);
  if (!vaccine) {
    res.status(404).json({ error: "Không tìm thấy vắc-xin" });
    return;
  }
  const doses = db
    .prepare("SELECT * FROM vaccine_doses WHERE vaccine_id = ? ORDER BY dose_number ASC")
    .all(id) as unknown as VaccineDoseRow[];
  res.json({ ...vaccine, doses });
});

vaccinesRouter.post("/", (req, res) => {
  const body = req.body as VaccineBody;
  const error = validateVaccineBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const maxOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) AS m FROM vaccines WHERE account = ?")
    .get(body.account as string) as unknown as { m: number };

  const result = db
    .prepare(
      `INSERT INTO vaccines (account, disease_name, vaccine_name, total_doses, duration_type, duration_years, expiry_month, expiry_year, next_dose_date, note, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?)`
    )
    .run(
      body.account as string,
      body.diseaseName!.trim(),
      body.vaccineName!.trim(),
      body.totalDoses ?? null,
      body.durationType as string,
      body.durationType === "limited" ? (body.durationYears as number) : null,
      body.nextDoseDate || null,
      body.note?.trim() || null,
      maxOrder.m + 1,
      new Date().toISOString()
    );

  const vaccineId = result.lastInsertRowid as number;
  recalcExpiry(vaccineId);
  const vaccine = db.prepare("SELECT * FROM vaccines WHERE id = ?").get(vaccineId) as unknown as VaccineRow;
  res.status(201).json({ ...vaccine, doseCount: 0, latestDose: null });
});

vaccinesRouter.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as VaccineBody;
  const error = validateVaccineBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const existing = getVaccineForAccount(id, body.account as string);
  if (!existing) {
    res.status(404).json({ error: "Không tìm thấy vắc-xin" });
    return;
  }
  db.prepare(
    `UPDATE vaccines SET disease_name = ?, vaccine_name = ?, total_doses = ?, duration_type = ?, duration_years = ?, next_dose_date = ?, note = ?
     WHERE id = ?`
  ).run(
    body.diseaseName!.trim(),
    body.vaccineName!.trim(),
    body.totalDoses ?? null,
    body.durationType as string,
    body.durationType === "limited" ? (body.durationYears as number) : null,
    body.nextDoseDate || null,
    body.note?.trim() || null,
    id
  );
  recalcExpiry(id);
  const vaccine = db.prepare("SELECT * FROM vaccines WHERE id = ?").get(id) as unknown as VaccineRow;
  res.json({ ...vaccine, ...getDosesSummary(id) });
});

vaccinesRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  const existing = getVaccineForAccount(id, account);
  if (!existing) {
    res.status(404).json({ error: "Không tìm thấy vắc-xin" });
    return;
  }
  db.prepare("DELETE FROM vaccine_doses WHERE vaccine_id = ?").run(id);
  db.prepare("DELETE FROM vaccines WHERE id = ?").run(id);
  res.status(204).end();
});

vaccinesRouter.post("/:id/reorder", (req, res) => {
  const id = Number(req.params.id);
  const { account, direction } = req.body as { account?: string; direction?: "up" | "down" };
  if (!isValidAccountId(account) || (direction !== "up" && direction !== "down")) {
    res.status(400).json({ error: "Thiếu tham số" });
    return;
  }
  const current = getVaccineForAccount(id, account);
  if (!current) {
    res.status(404).json({ error: "Không tìm thấy vắc-xin" });
    return;
  }
  const neighbor = db
    .prepare(
      direction === "up"
        ? "SELECT * FROM vaccines WHERE account = ? AND sort_order < ? ORDER BY sort_order DESC LIMIT 1"
        : "SELECT * FROM vaccines WHERE account = ? AND sort_order > ? ORDER BY sort_order ASC LIMIT 1"
    )
    .get(account, current.sort_order) as VaccineRow | undefined;
  if (!neighbor) {
    res.json({ success: true });
    return;
  }
  db.prepare("UPDATE vaccines SET sort_order = ? WHERE id = ?").run(neighbor.sort_order, current.id);
  db.prepare("UPDATE vaccines SET sort_order = ? WHERE id = ?").run(current.sort_order, neighbor.id);
  res.json({ success: true });
});

vaccinesRouter.post("/:id/confirm-dose", (req, res) => {
  const id = Number(req.params.id);
  const { account, date } = req.body as { account?: string; date?: string };
  if (!isValidAccountId(account) || !date) {
    res.status(400).json({ error: "Thiếu tham số" });
    return;
  }
  const vaccine = getVaccineForAccount(id, account);
  if (!vaccine) {
    res.status(404).json({ error: "Không tìm thấy vắc-xin" });
    return;
  }
  const maxDose = db
    .prepare("SELECT COALESCE(MAX(dose_number), 0) AS m FROM vaccine_doses WHERE vaccine_id = ?")
    .get(id) as unknown as { m: number };
  db.prepare(
    `INSERT INTO vaccine_doses (vaccine_id, dose_number, location, date, note, created_at)
     VALUES (?, ?, NULL, ?, NULL, ?)`
  ).run(id, maxDose.m + 1, date, new Date().toISOString());
  db.prepare("UPDATE vaccines SET next_dose_date = NULL WHERE id = ?").run(id);
  recalcExpiry(id);

  const updatedVaccine = db.prepare("SELECT * FROM vaccines WHERE id = ?").get(id) as unknown as VaccineRow;
  res.json({ ...updatedVaccine, ...getDosesSummary(id) });
});

interface DoseBody {
  account?: string;
  doseNumber?: number;
  location?: string;
  date?: string;
  note?: string;
}

function validateDoseBody(body: DoseBody): string | null {
  if (!isValidAccountId(body.account)) return "Thiếu hoặc sai tài khoản";
  if (typeof body.doseNumber !== "number" || body.doseNumber < 1) return "Thiếu mũi số mấy";
  if (!body.date) return "Thiếu ngày tiêm";
  return null;
}

vaccinesRouter.post("/:id/doses", (req, res) => {
  const vaccineId = Number(req.params.id);
  const body = req.body as DoseBody;
  const error = validateDoseBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const vaccine = getVaccineForAccount(vaccineId, body.account as string);
  if (!vaccine) {
    res.status(404).json({ error: "Không tìm thấy vắc-xin" });
    return;
  }
  const result = db
    .prepare(
      `INSERT INTO vaccine_doses (vaccine_id, dose_number, location, date, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(vaccineId, body.doseNumber as number, body.location || null, body.date as string, body.note || null, new Date().toISOString());
  recalcExpiry(vaccineId);
  const dose = db.prepare("SELECT * FROM vaccine_doses WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(dose);
});

vaccinesRouter.put("/:id/doses/:doseId", (req, res) => {
  const vaccineId = Number(req.params.id);
  const doseId = Number(req.params.doseId);
  const body = req.body as DoseBody;
  const error = validateDoseBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const vaccine = getVaccineForAccount(vaccineId, body.account as string);
  if (!vaccine) {
    res.status(404).json({ error: "Không tìm thấy vắc-xin" });
    return;
  }
  const existing = db
    .prepare("SELECT id FROM vaccine_doses WHERE id = ? AND vaccine_id = ?")
    .get(doseId, vaccineId);
  if (!existing) {
    res.status(404).json({ error: "Không tìm thấy mũi tiêm" });
    return;
  }
  db.prepare("UPDATE vaccine_doses SET dose_number = ?, location = ?, date = ?, note = ? WHERE id = ?").run(
    body.doseNumber as number,
    body.location || null,
    body.date as string,
    body.note || null,
    doseId
  );
  recalcExpiry(vaccineId);
  const dose = db.prepare("SELECT * FROM vaccine_doses WHERE id = ?").get(doseId);
  res.json(dose);
});

vaccinesRouter.delete("/:id/doses/:doseId", (req, res) => {
  const vaccineId = Number(req.params.id);
  const doseId = Number(req.params.doseId);
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  const vaccine = getVaccineForAccount(vaccineId, account);
  if (!vaccine) {
    res.status(404).json({ error: "Không tìm thấy vắc-xin" });
    return;
  }
  db.prepare("DELETE FROM vaccine_doses WHERE id = ? AND vaccine_id = ?").run(doseId, vaccineId);
  recalcExpiry(vaccineId);
  res.status(204).end();
});
