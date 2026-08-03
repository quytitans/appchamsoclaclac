import { Router } from "express";
import { db } from "../db/index.js";
import { isValidAccountId } from "../hash.js";
import { addHoursToNaiveDateTime } from "../dateUtils.js";
import type { ThawedMilkBody, ThawedMilkRow } from "../types.js";

export const thawedMilkRouter = Router();

// Danh sách này quyết định banner "hết hạn"/tự ẩn sau 12h hiển thị trên client — nếu bị trình
// duyệt/proxy nào đó cache lại response GET, client sẽ hiện thông tin cũ (ví dụ sữa đã hết hạn
// nhưng vẫn hiện như còn hạn). Chặn tận gốc bằng no-store thay vì trông chờ hành vi mặc định.
thawedMilkRouter.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

const NAIVE_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function validateBody(body: ThawedMilkBody): string | null {
  if (!isValidAccountId(body.account)) return "Thiếu hoặc sai tài khoản";
  if (!body.takenOutAt || !NAIVE_DATETIME_RE.test(body.takenOutAt)) {
    return "Thiếu ngày giờ lấy ra khỏi trữ đông";
  }
  if (body.storageDate != null && body.storageDate !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(body.storageDate)) {
    return "Ngày lưu trữ không hợp lệ";
  }
  if (typeof body.expiryHours !== "number" || !Number.isFinite(body.expiryHours) || body.expiryHours <= 0) {
    return "Hạn sử dụng phải là số giờ lớn hơn 0";
  }
  return null;
}

thawedMilkRouter.get("/", (req, res) => {
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  const rows = db
    .prepare("SELECT * FROM thawed_milk WHERE account = ? ORDER BY expiry_at ASC")
    .all(account) as unknown as ThawedMilkRow[];
  res.json(rows);
});

thawedMilkRouter.post("/", (req, res) => {
  const body = req.body as ThawedMilkBody;
  const error = validateBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const takenOutAt = body.takenOutAt as string;
  const expiryHours = body.expiryHours as number;
  const expiryAt = addHoursToNaiveDateTime(takenOutAt, expiryHours);

  const result = db
    .prepare(
      `INSERT INTO thawed_milk (account, storage_date, taken_out_at, expiry_hours, expiry_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.account as string,
      body.storageDate || null,
      takenOutAt,
      expiryHours,
      expiryAt,
      new Date().toISOString()
    );

  const row = db.prepare("SELECT * FROM thawed_milk WHERE id = ?").get(result.lastInsertRowid) as unknown as ThawedMilkRow;
  res.status(201).json(row);
});

thawedMilkRouter.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as ThawedMilkBody;
  const error = validateBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const account = body.account as string;
  const existing = db.prepare("SELECT id FROM thawed_milk WHERE id = ? AND account = ?").get(id, account);
  if (!existing) {
    res.status(404).json({ error: "Không tìm thấy bản ghi" });
    return;
  }

  const takenOutAt = body.takenOutAt as string;
  const expiryHours = body.expiryHours as number;
  const expiryAt = addHoursToNaiveDateTime(takenOutAt, expiryHours);

  db.prepare(
    `UPDATE thawed_milk SET storage_date = ?, taken_out_at = ?, expiry_hours = ?, expiry_at = ?
     WHERE id = ? AND account = ?`
  ).run(body.storageDate || null, takenOutAt, expiryHours, expiryAt, id, account);

  const row = db.prepare("SELECT * FROM thawed_milk WHERE id = ?").get(id) as unknown as ThawedMilkRow;
  res.json(row);
});

thawedMilkRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  db.prepare("DELETE FROM thawed_milk WHERE id = ? AND account = ?").run(id, account);
  res.status(204).end();
});
