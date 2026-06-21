import { createHash, randomBytes } from "node:crypto";

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

export function isValidAccountId(account: unknown): account is string {
  return typeof account === "string" && /^[a-z0-9_-]{2,32}$/.test(account);
}

export function randomToken(): string {
  return randomBytes(32).toString("hex");
}
