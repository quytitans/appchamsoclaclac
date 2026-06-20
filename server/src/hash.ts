import { createHash } from "node:crypto";

export function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

export function isValidPinFormat(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}
