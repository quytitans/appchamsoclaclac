import { db } from "./db/index.js";

const RETENTION_DAYS = 2;
const CLEANUP_SETTING_KEY = "usage_logs_last_cleanup_date";

function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

// Usage logs are written far more often than error logs (every mutating request),
// so unlike errorLog.ts we don't want to run the DELETE on every single insert —
// only once per calendar day, tracked via a marker row in `settings`.
function cleanupIfFirstLogToday(): void {
  const today = todayDateStr();
  const marker = db.prepare("SELECT value FROM settings WHERE key = ?").get(CLEANUP_SETTING_KEY) as
    | { value: string }
    | undefined;
  if (marker?.value === today) return;

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`DELETE FROM usage_logs WHERE created_at < ?`).run(cutoff);
  db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`).run(CLEANUP_SETTING_KEY, today);
}

/**
 * Records that an account performed some state-changing action (any non-GET
 * request), for an admin-visible activity trail. Minimal by design: which route,
 * when, by whom, and the resulting status — no request bodies or tokens.
 * Retention: only the last 2 days are kept.
 */
export function logUsage(route: string, statusCode: number, account?: string | null): void {
  cleanupIfFirstLogToday();
  db.prepare(
    `INSERT INTO usage_logs (created_at, route, status_code, account) VALUES (?, ?, ?, ?)`
  ).run(new Date().toISOString(), route, statusCode, account ?? null);
}
