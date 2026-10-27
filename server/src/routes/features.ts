import { Router } from "express";
import { db } from "../db/index.js";
import { getAccountByToken } from "./auth.js";
import type { FeatureFlagRow } from "../types.js";

export const featuresRouter = Router();

// Danh sách chức năng ở trang chủ được phép admin bật/tắt (khớp seedFeatureFlag trong db/index.ts).
const TOGGLEABLE_KEYS = new Set(["NOTE_STATS", "VACCINE", "DIARY", "GROWTH"]);

featuresRouter.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM feature_flags").all() as unknown as FeatureFlagRow[];
  res.json(rows.map((r) => ({ key: r.key, enabled: r.enabled === 1 })));
});

featuresRouter.post("/toggle", (req, res) => {
  const { token, key, enabled } = req.body as { token?: string; key?: string; enabled?: boolean };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Thiếu token" });
    return;
  }
  const admin = getAccountByToken(token);
  if (!admin || admin.is_admin !== 1) {
    res.status(403).json({ error: "Không có quyền truy cập" });
    return;
  }
  if (!key || !TOGGLEABLE_KEYS.has(key) || typeof enabled !== "boolean") {
    res.status(400).json({ error: "Thiếu hoặc sai tham số" });
    return;
  }
  db.prepare("INSERT OR REPLACE INTO feature_flags (key, enabled) VALUES (?, ?)").run(key, enabled ? 1 : 0);
  res.json({ success: true });
});
