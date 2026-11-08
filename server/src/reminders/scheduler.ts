import { db } from "../db/index.js";
import { todayStr } from "../dateUtils.js";
import { logError } from "../errorLog.js";
import { runVaccineReminders } from "./vaccineReminderJob.js";

/**
 * Daily 07:00 (Asia/Ho_Chi_Minh) vaccine reminder schedule — plain setTimeout, no cron lib.
 *
 * OPT-IN: only runs when ENABLE_VACCINE_REMINDERS=true. Set it on the production VPS
 * only — a dev machine running a copy of the DB must never email real families.
 *
 * Catch-up: if the process starts after 07:00 and today's run hasn't happened (e.g. a
 * deploy/restart at 07:00, or a crash), it runs shortly after startup. Duplicate sends
 * are impossible either way — vaccine_reminder_logs dedupes every (dose, tier).
 */
const RUN_HOUR_VN = 7;
const VN_OFFSET_MS = 7 * 3600_000; // Vietnam has no DST
const LAST_RUN_KEY = "vaccine_reminder_last_run";
const STARTUP_DELAY_MS = 30_000;

let running = false;

export function msUntilNextRun(now = Date.now()): number {
  const vnNow = new Date(now + VN_OFFSET_MS);
  const target = Date.UTC(vnNow.getUTCFullYear(), vnNow.getUTCMonth(), vnNow.getUTCDate(), RUN_HOUR_VN) - VN_OFFSET_MS;
  return target > now ? target - now : target + 86400_000 - now;
}

function vnHourNow(): number {
  return new Date(Date.now() + VN_OFFSET_MS).getUTCHours();
}

function getLastRun(): string | null {
  return (db.prepare("SELECT value FROM settings WHERE key = ?").get(LAST_RUN_KEY) as { value: string } | undefined)?.value ?? null;
}

async function runOnce(trigger: string): Promise<void> {
  if (running) return;
  running = true;
  const today = todayStr();
  try {
    const s = await runVaccineReminders({ today });
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
      LAST_RUN_KEY,
      today
    );
    console.log(
      `[vaccine-reminders] ${trigger} ${today}: ${s.profilesEmailed} sổ, ${s.dosesReminded} mũi, gửi ${s.recipientsSent}, lỗi ${s.recipientsFailed}, sổ không có email ${s.skippedNoEmail}`
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[vaccine-reminders] ${trigger} failed: ${msg}`);
    try {
      logError("job:vaccine-reminders", 500, msg);
    } catch {
      /* never let logging crash the scheduler */
    }
  } finally {
    running = false;
  }
}

function scheduleNext(): void {
  const delay = msUntilNextRun();
  setTimeout(async () => {
    await runOnce("scheduled");
    scheduleNext();
  }, delay).unref();
  console.log(`[vaccine-reminders] lần chạy kế tiếp sau ${Math.round(delay / 60000)} phút`);
}

export function startVaccineReminderScheduler(): void {
  if (process.env.ENABLE_VACCINE_REMINDERS !== "true") {
    console.log("[vaccine-reminders] tắt (ENABLE_VACCINE_REMINDERS != true)");
    return;
  }
  scheduleNext();
  if (vnHourNow() >= RUN_HOUR_VN && getLastRun() !== todayStr()) {
    setTimeout(() => void runOnce("catch-up"), STARTUP_DELAY_MS).unref();
  }
}
