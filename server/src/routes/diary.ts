import { Router } from "express";
import { db } from "../db/index.js";
import { isValidAccountId } from "../hash.js";
import type { DiaryEntryRow } from "../types.js";

export const diaryRouter = Router();

const VALID_IMPORTANCE = ["cao", "rat_cao", "cuc_ky_cao"];

interface DiaryBody {
  account?: string;
  entryDate?: string;
  title?: string;
  content?: string;
  importance?: string;
}

function validateDiaryBody(body: DiaryBody): string | null {
  if (!isValidAccountId(body.account)) return "Thiếu hoặc sai tài khoản";
  if (!body.entryDate) return "Thiếu ngày viết";
  if (!body.title || !body.title.trim()) return "Thiếu tiêu đề";
  if (!body.content || !body.content.trim()) return "Thiếu nội dung";
  if (body.importance && !VALID_IMPORTANCE.includes(body.importance)) return "Mức độ quan trọng không hợp lệ";
  return null;
}

diaryRouter.get("/", (req, res) => {
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  const entries = db
    .prepare("SELECT * FROM diary_entries WHERE account = ? ORDER BY entry_date DESC, created_at DESC")
    .all(account) as unknown as DiaryEntryRow[];
  res.json(entries);
});

diaryRouter.post("/", (req, res) => {
  const body = req.body as DiaryBody;
  const error = validateDiaryBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const result = db
    .prepare(
      `INSERT INTO diary_entries (account, entry_date, title, content, importance, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      body.account as string,
      body.entryDate as string,
      body.title!.trim(),
      body.content!.trim(),
      body.importance ?? null,
      new Date().toISOString()
    );

  const entry = db.prepare("SELECT * FROM diary_entries WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json(entry);
});

diaryRouter.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as DiaryBody;
  const error = validateDiaryBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const existing = db
    .prepare("SELECT id FROM diary_entries WHERE id = ? AND account = ?")
    .get(id, body.account as string);
  if (!existing) {
    res.status(404).json({ error: "Không tìm thấy nhật ký" });
    return;
  }
  db.prepare(
    `UPDATE diary_entries SET entry_date = ?, title = ?, content = ?, importance = ? WHERE id = ? AND account = ?`
  ).run(
    body.entryDate as string,
    body.title!.trim(),
    body.content!.trim(),
    body.importance ?? null,
    id,
    body.account as string
  );
  const entry = db.prepare("SELECT * FROM diary_entries WHERE id = ?").get(id);
  res.json(entry);
});

diaryRouter.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  db.prepare("DELETE FROM diary_entries WHERE id = ? AND account = ?").run(id, account);
  res.status(204).end();
});
