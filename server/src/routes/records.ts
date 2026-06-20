import { Router } from "express";
import { db } from "../db/index.js";
import type { CreateRecordBody, RecordRow, RecordType } from "../types.js";

export const recordsRouter = Router();

const VALID_TYPES: RecordType[] = [
  "hut_sua",
  "ti_me",
  "ti_binh",
  "non_tro",
  "di_nang",
  "di_nhe",
  "can_nang",
  "chieu_cao",
  "custom",
];

const VALID_SIDES = ["trai", "phai", "ca_hai"];
const VALID_NON_TRO_LEVELS = ["nhe", "trung_binh", "nhieu", "rat_nhieu"];

function validateBody(body: CreateRecordBody): string | null {
  if (!body.type || !VALID_TYPES.includes(body.type)) return "Loại hoạt động không hợp lệ";
  if (!body.date) return "Thiếu ngày";
  if (typeof body.volumeMl === "number" && body.volumeMl < 0) return "Dung tích không được âm";
  if (typeof body.weightKg === "number" && body.weightKg < 0) return "Khối lượng không được âm";
  if (typeof body.heightCm === "number" && body.heightCm < 0) return "Kích thước không được âm";

  switch (body.type) {
    case "hut_sua":
      if (!body.time) return "Thiếu giờ hút sữa";
      if (!body.side || !VALID_SIDES.includes(body.side)) return "Thiếu vị trí hút sữa";
      if (typeof body.volumeMl !== "number") return "Thiếu dung tích";
      break;
    case "ti_me":
      if (!body.time) return "Thiếu giờ ti mẹ";
      if (!body.side || !VALID_SIDES.includes(body.side)) return "Thiếu vị trí ti mẹ";
      break;
    case "ti_binh":
      if (!body.time) return "Thiếu giờ ti bình";
      if (typeof body.volumeMl !== "number") return "Thiếu dung tích";
      break;
    case "non_tro":
      if (!body.time) return "Thiếu giờ nôn chớ";
      if (!body.status || !VALID_NON_TRO_LEVELS.includes(body.status)) return "Thiếu mức độ nôn chớ";
      break;
    case "di_nang":
      if (!body.time) return "Thiếu giờ đi nặng";
      if (body.status !== "binh_thuong" && body.status !== "co_van_de") return "Thiếu trạng thái";
      break;
    case "di_nhe":
      if (!body.time) return "Thiếu giờ đi nhẹ";
      break;
    case "can_nang":
      if (typeof body.weightKg !== "number") return "Thiếu khối lượng";
      break;
    case "chieu_cao":
      if (typeof body.heightCm !== "number") return "Thiếu kích thước";
      break;
    case "custom":
      if (!body.customName) return "Thiếu tên hoạt động";
      break;
  }
  return null;
}

recordsRouter.post("/", (req, res) => {
  const body = req.body as CreateRecordBody;
  const error = validateBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const stmt = db.prepare(`
    INSERT INTO records (type, date, time, side, volume_ml, status, weight_kg, height_cm, custom_name, custom_value, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    body.type,
    body.date,
    body.time ?? null,
    body.side ?? null,
    body.volumeMl ?? null,
    body.status ?? null,
    body.weightKg ?? null,
    body.heightCm ?? null,
    body.customName ?? null,
    body.customValue ?? null,
    body.note ?? null,
    new Date().toISOString()
  );

  const row = db
    .prepare("SELECT * FROM records WHERE id = ?")
    .get(result.lastInsertRowid) as unknown as RecordRow;
  res.status(201).json(row);
});

recordsRouter.get("/", (req, res) => {
  const date = req.query.date as string | undefined;
  if (!date) {
    res.status(400).json({ error: "Thiếu tham số date" });
    return;
  }
  const rows = db
    .prepare("SELECT * FROM records WHERE date = ? ORDER BY time ASC, created_at ASC")
    .all(date) as unknown as RecordRow[];
  res.json(rows);
});

recordsRouter.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as CreateRecordBody;
  const error = validateBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const existing = db.prepare("SELECT id FROM records WHERE id = ?").get(id);
  if (!existing) {
    res.status(404).json({ error: "Không tìm thấy bản ghi" });
    return;
  }

  db.prepare(
    `UPDATE records SET type = ?, date = ?, time = ?, side = ?, volume_ml = ?, status = ?, weight_kg = ?, height_cm = ?, custom_name = ?, custom_value = ?, note = ?
     WHERE id = ?`
  ).run(
    body.type,
    body.date,
    body.time ?? null,
    body.side ?? null,
    body.volumeMl ?? null,
    body.status ?? null,
    body.weightKg ?? null,
    body.heightCm ?? null,
    body.customName ?? null,
    body.customValue ?? null,
    body.note ?? null,
    id
  );

  const row = db.prepare("SELECT * FROM records WHERE id = ?").get(id) as unknown as RecordRow;
  res.json(row);
});

recordsRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  db.prepare("DELETE FROM records WHERE id = ?").run(id);
  res.status(204).end();
});
