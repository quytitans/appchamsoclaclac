import { db } from "./db/index.js";

const MAX_MESSAGE_LENGTH = 300;
const RETENTION_DAYS = 7;

/**
 * Records an unexpected server-side error (5xx / infra-level failure) for later
 * diagnosis. Deliberately minimal: no stack traces, request bodies, tokens, or file
 * data — just enough to spot a pattern (which route, how often, which account).
 * Do not call this for routine 4xx validation failures (wrong PIN, missing field,
 * etc.) — those are expected and frequent, and would drown out real signal.
 *
 * Retention: only the last 7 days are kept. The cleanup check runs on every insert
 * (errors are rare enough that this is cheap) rather than on a schedule.
 */
export function logError(route: string, statusCode: number, message: string, account?: string | null): void {
  db.prepare(
    `INSERT INTO error_logs (created_at, route, status_code, message, account) VALUES (?, ?, ?, ?, ?)`
  ).run(new Date().toISOString(), route, statusCode, message.slice(0, MAX_MESSAGE_LENGTH), account ?? null);

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`DELETE FROM error_logs WHERE created_at < ?`).run(cutoff);
}
