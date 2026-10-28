import { Router } from "express";
import { db } from "../db/index.js";
import { isValidAccountId } from "../hash.js";
import { deleteDriveFiles } from "../drive/imageUpload.js";
import { logError } from "../errorLog.js";
import type { BabyFaceRow, DriveUploadRow } from "../types.js";

// The Face — mỗi bản ghi là đúng 1 ảnh gương mặt bé kèm ngày chụp. Ảnh được upload trước qua
// /api/uploads/image (route đó đã chặn tài khoản không Premium), ở đây chỉ gắn upload id vào.
export const facesRouter = Router();

interface FaceBody {
  account?: string;
  faceDate?: string;
  photoUploadId?: unknown;
}

function validateFaceBody(body: FaceBody): string | null {
  if (!isValidAccountId(body.account)) return "Thiếu hoặc sai tài khoản";
  if (!body.faceDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.faceDate)) return "Thiếu hoặc sai ngày chụp";
  if (!Number.isInteger(Number(body.photoUploadId))) return "Thiếu ảnh";
  return null;
}

function getOwnedUpload(uploadId: number, account: string): DriveUploadRow | undefined {
  return db
    .prepare("SELECT * FROM drive_uploads WHERE id = ? AND account = ?")
    .get(uploadId, account) as unknown as DriveUploadRow | undefined;
}

function withPhoto(face: BabyFaceRow) {
  const photo = db.prepare("SELECT * FROM drive_uploads WHERE id = ?").get(face.drive_upload_id) as unknown as
    | DriveUploadRow
    | undefined;
  return { id: face.id, account: face.account, face_date: face.face_date, created_at: face.created_at, photo };
}

async function removeUpload(upload: DriveUploadRow | undefined, account: string, route: string): Promise<void> {
  if (!upload) return;
  try {
    await deleteDriveFiles([upload.full_file_id, upload.thumb_file_id]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi xoá ảnh trên Google Drive";
    console.error("Lỗi xoá ảnh trên Google Drive:", err);
    logError(route, 502, message, account);
  }
  db.prepare("DELETE FROM drive_uploads WHERE id = ?").run(upload.id);
}

facesRouter.get("/", (req, res) => {
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  const faces = db
    .prepare("SELECT * FROM baby_faces WHERE account = ? ORDER BY face_date DESC, created_at DESC")
    .all(account) as unknown as BabyFaceRow[];
  res.json(faces.map(withPhoto).filter((f) => f.photo));
});

facesRouter.post("/", (req, res) => {
  const body = req.body as FaceBody;
  const error = validateFaceBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const account = body.account as string;
  const uploadId = Number(body.photoUploadId);
  if (!getOwnedUpload(uploadId, account)) {
    res.status(400).json({ error: "Ảnh không hợp lệ hoặc không thuộc tài khoản này" });
    return;
  }

  const result = db
    .prepare(`INSERT INTO baby_faces (account, face_date, drive_upload_id, created_at) VALUES (?, ?, ?, ?)`)
    .run(account, body.faceDate as string, uploadId, new Date().toISOString());

  const face = db.prepare("SELECT * FROM baby_faces WHERE id = ?").get(result.lastInsertRowid) as unknown as BabyFaceRow;
  res.status(201).json(withPhoto(face));
});

facesRouter.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body as FaceBody;
  const error = validateFaceBody(body);
  if (error) {
    res.status(400).json({ error });
    return;
  }
  const account = body.account as string;
  const existing = db
    .prepare("SELECT * FROM baby_faces WHERE id = ? AND account = ?")
    .get(id, account) as unknown as BabyFaceRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "Không tìm thấy ảnh" });
    return;
  }
  const uploadId = Number(body.photoUploadId);
  if (!getOwnedUpload(uploadId, account)) {
    res.status(400).json({ error: "Ảnh không hợp lệ hoặc không thuộc tài khoản này" });
    return;
  }

  db.prepare("UPDATE baby_faces SET face_date = ?, drive_upload_id = ? WHERE id = ? AND account = ?").run(
    body.faceDate as string,
    uploadId,
    id,
    account
  );

  // Đổi sang ảnh khác thì ảnh cũ không còn ai dùng — dọn luôn trên Drive để không mồ côi.
  if (existing.drive_upload_id !== uploadId) {
    await removeUpload(getOwnedUpload(existing.drive_upload_id, account), account, "PUT /api/faces/:id (drive cleanup)");
  }

  const face = db.prepare("SELECT * FROM baby_faces WHERE id = ?").get(id) as unknown as BabyFaceRow;
  res.json(withPhoto(face));
});

facesRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }
  const existing = db
    .prepare("SELECT * FROM baby_faces WHERE id = ? AND account = ?")
    .get(id, account) as unknown as BabyFaceRow | undefined;
  if (!existing) {
    res.status(404).json({ error: "Không tìm thấy ảnh" });
    return;
  }

  db.prepare("DELETE FROM baby_faces WHERE id = ? AND account = ?").run(id, account);
  await removeUpload(getOwnedUpload(existing.drive_upload_id, account), account, "DELETE /api/faces/:id (drive cleanup)");
  res.status(204).end();
});
