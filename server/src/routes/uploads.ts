import { Router } from "express";
import multer from "multer";
import { db } from "../db/index.js";
import { isValidAccountId } from "../hash.js";
import { uploadImage, deleteDriveFiles } from "../drive/imageUpload.js";
import { getAccountByToken } from "./auth.js";
import type { AccountRow, DriveUploadRow } from "../types.js";

export const uploadsRouter = Router();

function getAuthorizedAccount(token: unknown, account: string): AccountRow | null {
  if (!token || typeof token !== "string") return null;
  const row = getAccountByToken(token);
  if (!row || row.id !== account || row.is_active !== 1) return null;
  return row;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Chỉ chấp nhận file ảnh"));
      return;
    }
    cb(null, true);
  },
});

uploadsRouter.post("/image", (req, res) => {
  upload.single("image")(req, res, async (uploadErr) => {
    if (uploadErr) {
      res.status(400).json({ error: uploadErr.message || "Upload ảnh thất bại" });
      return;
    }

    const account = req.body?.account as string | undefined;
    if (!isValidAccountId(account)) {
      res.status(400).json({ error: "Thiếu hoặc sai tài khoản" });
      return;
    }

    const authorized = getAuthorizedAccount(req.body?.token, account);
    if (!authorized) {
      res.status(403).json({ error: "Không có quyền truy cập" });
      return;
    }

    if (authorized.is_premium !== 1) {
      res.status(403).json({ error: "Tính năng upload ảnh chỉ dành cho tài khoản Premium" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "Thiếu file ảnh" });
      return;
    }

    try {
      const result = await uploadImage(req.file.buffer);
      const insertResult = db
        .prepare(
          `INSERT INTO drive_uploads (account, full_file_id, full_url, thumb_file_id, thumb_url, width, height, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          account as string,
          result.fullFileId,
          result.fullUrl,
          result.thumbFileId,
          result.thumbUrl,
          result.width,
          result.height,
          new Date().toISOString()
        );

      const row = db.prepare("SELECT * FROM drive_uploads WHERE id = ?").get(insertResult.lastInsertRowid);
      res.status(201).json(row);
    } catch (err) {
      console.error("Lỗi upload ảnh lên Google Drive:", err);
      const message = err instanceof Error ? err.message : "Upload ảnh lên Google Drive thất bại";
      res.status(502).json({ error: message });
    }
  });
});

uploadsRouter.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const account = req.query.account as string | undefined;
  if (!isValidAccountId(account)) {
    res.status(400).json({ error: "Thiếu tham số account" });
    return;
  }

  if (!getAuthorizedAccount(req.query.token, account)) {
    res.status(403).json({ error: "Không có quyền truy cập" });
    return;
  }

  const row = db
    .prepare("SELECT * FROM drive_uploads WHERE id = ? AND account = ?")
    .get(id, account) as unknown as DriveUploadRow | undefined;

  if (!row) {
    res.status(404).json({ error: "Không tìm thấy ảnh" });
    return;
  }

  try {
    await deleteDriveFiles([row.full_file_id, row.thumb_file_id]);
  } catch (err) {
    console.error("Lỗi xoá ảnh trên Google Drive:", err);
  }

  db.prepare("DELETE FROM drive_uploads WHERE id = ? AND account = ?").run(id, account);
  res.status(204).end();
});
