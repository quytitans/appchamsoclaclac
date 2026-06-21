import { Router } from "express";
import { db } from "../db/index.js";
import { hashPin, isValidAccountId, isValidPinFormat, randomToken } from "../hash.js";
import type { AccountRow } from "../types.js";

export const authRouter = Router();

function getAccount(id: string): AccountRow | undefined {
  return db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as AccountRow | undefined;
}

function getAccountByToken(token: string): AccountRow | undefined {
  return db.prepare("SELECT * FROM accounts WHERE session_token = ?").get(token) as
    | AccountRow
    | undefined;
}

function publicAccount(a: AccountRow) {
  return { account: a.id, babyName: a.baby_name, isAdmin: a.is_admin === 1 };
}

authRouter.post("/login", (req, res) => {
  const { account, pin } = req.body as { account?: string; pin?: string };
  if (!account || typeof account !== "string" || !isValidPinFormat(pin)) {
    res.status(400).json({ error: "Thiếu tài khoản hoặc mã PIN không hợp lệ" });
    return;
  }
  const row = getAccount(account.trim().toLowerCase());
  if (!row || hashPin(pin) !== row.pin_hash) {
    res.status(401).json({ error: "Tài khoản hoặc mã PIN không đúng" });
    return;
  }
  if (row.is_active !== 1) {
    res.status(403).json({ error: "Tài khoản đã bị vô hiệu hóa" });
    return;
  }
  res.json({ token: row.session_token, ...publicAccount(row) });
});

authRouter.post("/verify-token", (req, res) => {
  const { token } = req.body as { token?: string };
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Thiếu token" });
    return;
  }
  const row = getAccountByToken(token);
  if (!row || row.is_active !== 1) {
    res.status(401).json({ error: "Token không hợp lệ" });
    return;
  }
  res.json({ token: row.session_token, ...publicAccount(row) });
});

authRouter.post("/change-pin", (req, res) => {
  const { account, currentPin, newPin } = req.body as {
    account?: string;
    currentPin?: string;
    newPin?: string;
  };
  if (!account || !isValidPinFormat(currentPin) || !isValidPinFormat(newPin)) {
    res.status(400).json({ error: "Mã PIN phải gồm 4 chữ số" });
    return;
  }
  const row = getAccount(account);
  if (!row || hashPin(currentPin) !== row.pin_hash) {
    res.status(401).json({ error: "Mã PIN hiện tại không đúng" });
    return;
  }
  const newToken = randomToken();
  db.prepare("UPDATE accounts SET pin_hash = ?, session_token = ? WHERE id = ?").run(
    hashPin(newPin),
    newToken,
    row.id
  );
  res.json({ token: newToken, ...publicAccount({ ...row, pin_hash: hashPin(newPin) }) });
});

function requireAdmin(token: unknown): AccountRow | null {
  if (!token || typeof token !== "string") return null;
  const row = getAccountByToken(token);
  if (!row || row.is_admin !== 1) return null;
  return row;
}

authRouter.get("/admin/accounts", (req, res) => {
  const admin = requireAdmin(req.query.token);
  if (!admin) {
    res.status(403).json({ error: "Không có quyền truy cập" });
    return;
  }
  const rows = db
    .prepare("SELECT id, baby_name, is_admin, is_active, created_at FROM accounts ORDER BY created_at ASC")
    .all() as { id: string; baby_name: string; is_admin: number; is_active: number; created_at: string }[];
  res.json(
    rows.map((r) => ({
      account: r.id,
      babyName: r.baby_name,
      isAdmin: r.is_admin === 1,
      isActive: r.is_active === 1,
      createdAt: r.created_at,
    }))
  );
});

authRouter.post("/admin/create-account", (req, res) => {
  const { token, account, babyName, pin } = req.body as {
    token?: string;
    account?: string;
    babyName?: string;
    pin?: string;
  };
  const admin = requireAdmin(token);
  if (!admin) {
    res.status(403).json({ error: "Không có quyền truy cập" });
    return;
  }
  const normalizedAccount = (account ?? "").trim().toLowerCase();
  if (!isValidAccountId(normalizedAccount)) {
    res.status(400).json({ error: "Tên tài khoản chỉ gồm chữ thường, số, gạch dưới/gạch ngang (2-32 ký tự)" });
    return;
  }
  if (!babyName || !babyName.trim()) {
    res.status(400).json({ error: "Thiếu tên bé" });
    return;
  }
  if (!isValidPinFormat(pin)) {
    res.status(400).json({ error: "Mã PIN phải gồm 4 chữ số" });
    return;
  }
  if (getAccount(normalizedAccount)) {
    res.status(409).json({ error: "Tài khoản này đã tồn tại" });
    return;
  }
  db.prepare(
    `INSERT INTO accounts (id, baby_name, pin_hash, session_token, is_admin, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`
  ).run(normalizedAccount, babyName.trim(), hashPin(pin), randomToken(), new Date().toISOString());
  res.status(201).json({ account: normalizedAccount, babyName: babyName.trim(), isAdmin: false });
});

authRouter.post("/admin/reset-pin", (req, res) => {
  const { token, targetAccount, newPin } = req.body as {
    token?: string;
    targetAccount?: string;
    newPin?: string;
  };
  const admin = requireAdmin(token);
  if (!admin) {
    res.status(403).json({ error: "Không có quyền truy cập" });
    return;
  }
  if (!targetAccount || !isValidPinFormat(newPin)) {
    res.status(400).json({ error: "Thiếu tài khoản hoặc mã PIN không hợp lệ" });
    return;
  }
  const target = getAccount(targetAccount);
  if (!target) {
    res.status(404).json({ error: "Không tìm thấy tài khoản" });
    return;
  }
  db.prepare("UPDATE accounts SET pin_hash = ?, session_token = ? WHERE id = ?").run(
    hashPin(newPin),
    randomToken(),
    target.id
  );
  res.json({ success: true });
});

authRouter.post("/admin/set-active", (req, res) => {
  const { token, targetAccount, active } = req.body as {
    token?: string;
    targetAccount?: string;
    active?: boolean;
  };
  const admin = requireAdmin(token);
  if (!admin) {
    res.status(403).json({ error: "Không có quyền truy cập" });
    return;
  }
  if (!targetAccount || typeof active !== "boolean") {
    res.status(400).json({ error: "Thiếu tài khoản hoặc trạng thái không hợp lệ" });
    return;
  }
  const target = getAccount(targetAccount);
  if (!target) {
    res.status(404).json({ error: "Không tìm thấy tài khoản" });
    return;
  }
  db.prepare("UPDATE accounts SET is_active = ?, session_token = ? WHERE id = ?").run(
    active ? 1 : 0,
    randomToken(),
    target.id
  );
  res.json({ success: true });
});

authRouter.post("/admin/delete-account", (req, res) => {
  const { token, targetAccount } = req.body as { token?: string; targetAccount?: string };
  const admin = requireAdmin(token);
  if (!admin) {
    res.status(403).json({ error: "Không có quyền truy cập" });
    return;
  }
  if (!targetAccount) {
    res.status(400).json({ error: "Thiếu tài khoản cần xóa" });
    return;
  }
  if (targetAccount === admin.id) {
    res.status(400).json({ error: "Không thể xóa tài khoản đang đăng nhập" });
    return;
  }
  const target = getAccount(targetAccount);
  if (!target) {
    res.status(404).json({ error: "Không tìm thấy tài khoản" });
    return;
  }
  const vaccineIds = db.prepare("SELECT id FROM vaccines WHERE account = ?").all(target.id) as { id: number }[];
  for (const v of vaccineIds) {
    db.prepare("DELETE FROM vaccine_doses WHERE vaccine_id = ?").run(v.id);
  }
  db.prepare("DELETE FROM vaccines WHERE account = ?").run(target.id);
  db.prepare("DELETE FROM records WHERE account = ?").run(target.id);
  db.prepare("DELETE FROM accounts WHERE id = ?").run(target.id);
  res.json({ success: true });
});
