import { db } from "./db/index.js";

const MAX_MESSAGE_LENGTH = 300;
// Rolling window — every insert prunes back down to this many rows, so the table
// size is self-bounded regardless of how many errors occur (no cron/cleanup job needed).
const MAX_ROWS = 300;

/**
 * Records an unexpected server-side error (5xx / infra-level failure) for later
 * diagnosis. Deliberately minimal: no stack traces, request bodies, tokens, or file
 * data — just enough to spot a pattern (which route, how often, which account).
 * Do not call this for routine 4xx validation failures (wrong PIN, missing field,
 * etc.) — those are expected and frequent, and would drown out real signal.
 */
export function logError(route: string, statusCode: number, message: string, account?: string | null): void {
  db.prepare(
    `INSERT INTO error_logs (created_at, route, status_code, message, account) VALUES (?, ?, ?, ?, ?)`
  ).run(new Date().toISOString(), route, statusCode, message.slice(0, MAX_MESSAGE_LENGTH), account ?? null);

  db.prepare(`DELETE FROM error_logs WHERE id NOT IN (SELECT id FROM error_logs ORDER BY id DESC LIMIT ?)`).run(
    MAX_ROWS
  );
}
