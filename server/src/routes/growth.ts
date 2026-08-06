import { Router } from "express";
import { db } from "../db/index.js";
import { isValidAccountId } from "../hash.js";
import type { GrowthRecordBody, GrowthRecordRow } from "../types.js";

export const growthRouter = Router();

function validateBody(body: GrowthRecordBody): string | null {
  if (!isValidAccountId(body.account)) return "Thiếu hoặc sai tài khoản";
  if (!body.date) return "Thiếu ngày nhập";
  if (typeof body.heightCm === "number" && body.heightCm < 0) return "Chiều cao không được âm";
  if (typeof body.weightKg === "number" && body.weightKg < 0) return "Cân nặng không được âm";
  if (typeof body.heightCm !== "number" && typeof body.weightKg !== "number") {
    return "Cần nhập ít nhất chiều cao hoặc cân nặng";
  }
  return null;
}

growthRouter.get("/", (req, res) => {
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  const rows = db
    .prepare("SELECT * FROM growth_records WHERE account = ? ORDER BY date ASC, created_at ASC")
    .all(account) as unknown as GrowthRecordRow[];
  res.json(rows);
});

growthRouter.post("/", (req, res) => {
  const body = req.body as GrowthRecordBody;
  const error = validateBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const result = db
    .prepare(
      `INSERT INTO growth_records (account, date, milestone_label, height_cm, weight_kg, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.account as string,
      body.date as string,
      body.milestoneLabel || null,
      body.heightCm ?? null,
      body.weightKg ?? null,
      new Date().toISOString()
    );

  const row = db
    .prepare("SELECT * FROM growth_records WHERE id = ?")
    .get(result.lastInsertRowid) as unknown as GrowthRecordRow;
  res.status(201).json(row);
});

growthRouter.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as GrowthRecordBody;
  const error = validateBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  const account = body.account as string;
  const existing = db.prepare("SELECT id FROM growth_records WHERE id = ? AND account = ?").get(id, account);
  if (!existing) {
    res.status(404).json({ error: "Không tìm thấy bản ghi" });
    return;
  }

  db.prepare(
    `UPDATE growth_records SET date = ?, milestone_label = ?, height_cm = ?, weight_kg = ?
     WHERE id = ? AND account = ?`
  ).run(body.date as string, body.milestoneLabel || null, body.heightCm ?? null, body.weightKg ?? null, id, account);

  const row = db.prepare("SELECT * FROM growth_records WHERE id = ?").get(id) as unknown as GrowthRecordRow;
  res.json(row);
});

growthRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  db.prepare("DELETE FROM growth_records WHERE id = ? AND account = ?").run(id, account);
  res.status(204).end();
});
