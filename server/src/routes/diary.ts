import { Router } from "express";
import { db } from "../db/index.js";
import { isValidAccountId } from "../hash.js";
import { deleteDriveFiles } from "../drive/imageUpload.js";
import { logError } from "../errorLog.js";
import type { DiaryEntryRow, DriveUploadRow } from "../types.js";

export const diaryRouter = Router();

const VALID_IMPORTANCE = ["cao", "rat_cao", "cuc_ky_cao"];
const MAX_PHOTOS = 12;

interface DiaryBody {
  account?: string;
  entryDate?: string;
  title?: string;
  content?: string;
  importance?: string;
  photoUploadIds?: unknown;
}

function validateDiaryBody(body: DiaryBody): string | null {
  if (!isValidAccountId(body.account)) return "Thiếu hoặc sai tài khoản";
  if (!body.entryDate) return "Thiếu ngày viết";
  if (!body.title || !body.title.trim()) return "Thiếu tiêu đề";
  if (!body.content || !body.content.trim()) return "Thiếu nội dung";
  if (body.importance && !VALID_IMPORTANCE.includes(body.importance)) return "Mức độ quan trọng không hợp lệ";
  return null;
}

function isPremiumAccount(account: string): boolean {
  const row = db.prepare("SELECT is_premium FROM accounts WHERE id = ?").get(account) as
    | { is_premium: number }
    | undefined;
  return row?.is_premium === 1;
}

function validatePhotoUploadIds(photoUploadIds: unknown, account: string): number[] | string {
  if (!Array.isArray(photoUploadIds)) return "Danh sách ảnh không hợp lệ";
  if (photoUploadIds.length > MAX_PHOTOS) return `Tối đa ${MAX_PHOTOS} ảnh mỗi nhật ký`;
  const ids = photoUploadIds.map((v) => Number(v));
  if (ids.some((v) => !Number.isInteger(v))) return "Danh sách ảnh không hợp lệ";
  for (const id of ids) {
    const owned = db.prepare("SELECT id FROM drive_uploads WHERE id = ? AND account = ?").get(id, account);
    if (!owned) return "Ảnh không hợp lệ hoặc không thuộc tài khoản này";
  }
  return ids;
}

function insertPhotoLinks(entryId: number, ids: number[]): void {
  const now = new Date().toISOString();
  ids.forEach((uploadId, index) => {
    db.prepare(
      `INSERT INTO diary_photos (diary_entry_id, drive_upload_id, sort_order, created_at) VALUES (?, ?, ?, ?)`
    ).run(entryId, uploadId, index, now);
  });
}

function getPhotosForEntry(entryId: number): DriveUploadRow[] {
  return db
    .prepare(
      `SELECT du.* FROM diary_photos dp
       JOIN drive_uploads du ON du.id = dp.drive_upload_id
       WHERE dp.diary_entry_id = ?
       ORDER BY dp.sort_order ASC`
    )
    .all(entryId) as unknown as DriveUploadRow[];
}

function withPhotos(entry: DiaryEntryRow) {
  return { ...entry, photos: getPhotosForEntry(entry.id) };
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
  res.json(entries.map(withPhotos));
});

diaryRouter.post("/", (req, res) => {
  const body = req.body as DiaryBody;
  const error = validateDiaryBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }

  let photoIds: number[] = [];
  if (body.photoUploadIds !== undefined) {
    const validated = validatePhotoUploadIds(body.photoUploadIds, body.account as string);
    if (typeof validated === "string") {
      res.status(400).json({ error: validated });
      return;
    }
    photoIds = validated;
  }

  // Chặn cả ở tầng API (không chỉ ẩn UI): tài khoản không Premium không được gắn ảnh —
  // kể cả ảnh "mồ côi" cũ đã upload từ lúc còn Premium — vào bất kỳ nhật ký nào.
  if (photoIds.length > 0 && !isPremiumAccount(body.account as string)) {
    res.status(403).json({ error: "Tính năng gắn ảnh chỉ dành cho tài khoản Premium" });
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

  const entryId = result.lastInsertRowid as number;
  insertPhotoLinks(entryId, photoIds);

  const entry = db.prepare("SELECT * FROM diary_entries WHERE id = ?").get(entryId) as unknown as DiaryEntryRow;
  res.status(201).json(withPhotos(entry));
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

  let photoIds: number[] | null = null;
  if (body.photoUploadIds !== undefined) {
    const validated = validatePhotoUploadIds(body.photoUploadIds, body.account as string);
    if (typeof validated === "string") {
      res.status(400).json({ error: validated });
      return;
    }
    photoIds = validated;

    // Tài khoản đã bị hạ khỏi Premium vẫn được giữ/bớt ảnh cũ của chính nhật ký này (không
    // vỡ dữ liệu), nhưng không được gắn thêm ảnh mới — kể cả ảnh "mồ côi" cũ từ lúc còn
    // Premium — thông qua route này để né premium gate của route upload.
    const existingIds = new Set(getPhotosForEntry(id).map((p) => p.id));
    const hasNewPhoto = photoIds.some((pid) => !existingIds.has(pid));
    if (hasNewPhoto && !isPremiumAccount(body.account as string)) {
      res.status(403).json({ error: "Tính năng gắn ảnh chỉ dành cho tài khoản Premium" });
      return;
    }
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

  if (photoIds !== null) {
    db.prepare("DELETE FROM diary_photos WHERE diary_entry_id = ?").run(id);
    insertPhotoLinks(id, photoIds);
  }

  const entry = db.prepare("SELECT * FROM diary_entries WHERE id = ?").get(id) as unknown as DiaryEntryRow;
  res.json(withPhotos(entry));
});

diaryRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }

  const existing = db.prepare("SELECT id FROM diary_entries WHERE id = ? AND account = ?").get(id, account);
  if (!existing) {
    res.status(404).json({ error: "Không tìm thấy nhật ký" });
    return;
  }

  const photos = getPhotosForEntry(id);
  if (photos.length > 0) {
    try {
      await deleteDriveFiles(photos.flatMap((p) => [p.full_file_id, p.thumb_file_id]));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Lỗi xoá ảnh trên Google Drive";
      console.error("Lỗi xoá ảnh trên Google Drive:", err);
      logError("DELETE /api/diary/:id (drive cleanup)", 502, message, account ?? null);
    }
    const placeholders = photos.map(() => "?").join(",");
    db.prepare(`DELETE FROM drive_uploads WHERE id IN (${placeholders})`).run(...photos.map((p) => p.id));
  }
  db.prepare("DELETE FROM diary_photos WHERE diary_entry_id = ?").run(id);
  db.prepare("DELETE FROM diary_entries WHERE id = ? AND account = ?").run(id, account);
  res.status(204).end();
});
