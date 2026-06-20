import { Router } from "express";
import { db } from "../db/index.js";
import { hashPin, isValidPinFormat } from "../hash.js";

export const authRouter = Router();

function getPinHash(): string {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'pin_hash'").get() as
    | { value: string }
    | undefined;
  return row?.value ?? "";
}

function setPinHash(hash: string): void {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES ('pin_hash', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(hash);
}

authRouter.post("/verify", (req, res) => {
  const { pin } = req.body as { pin?: string };
  if (!isValidPinFormat(pin)) {
    res.status(400).json({ error: "Mã PIN phải gồm 4 chữ số" });
    return;
  }
  res.json({ valid: hashPin(pin) === getPinHash() });
});

authRouter.post("/change-pin", (req, res) => {
  const { currentPin, newPin } = req.body as { currentPin?: string; newPin?: string };
  if (!isValidPinFormat(currentPin) || !isValidPinFormat(newPin)) {
    res.status(400).json({ error: "Mã PIN phải gồm 4 chữ số" });
    return;
  }
  if (hashPin(currentPin) !== getPinHash()) {
    res.status(401).json({ error: "Mã PIN hiện tại không đúng" });
    return;
  }
  setPinHash(hashPin(newPin));
  res.json({ success: true });
});
