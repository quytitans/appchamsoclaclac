import { db } from "../db/index.js";
import { todayStr } from "../dateUtils.js";
import { logError } from "../errorLog.js";
import { sendMail } from "../mail/index.js";
import type { VaccineProfileType } from "../types.js";
import {
  buildReminderHtml,
  buildReminderSubject,
  buildReminderText,
  type ReminderDose,
} from "./vaccineReminderTemplate.js";

/**
 * Reminder tiers, in days before the planned date. Each dose gets at most one email per
 * tier. A tier "covers" a window rather than one exact day so a missed run (server down,
 * Gmail outage) is caught up the next day instead of silently skipped:
 *   tier 7 → 4..7 days left, tier 3 → 2..3 days left, tier 1 → 1 day left.
 */
export const REMINDER_TIERS = [7, 3, 1] as const;
const MAX_DAYS = REMINDER_TIERS[0];
const JOB_ROUTE = "job:vaccine-reminders";

function tierFor(daysLeft: number): number | null {
  if (daysLeft < 1 || daysLeft > MAX_DAYS) return null;
  // smallest tier that is >= daysLeft
  return [...REMINDER_TIERS].reverse().find((t) => daysLeft <= t) ?? null;
}

function addDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function diffDays(from: string, to: string): number {
  const toUtc = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toUtc(to) - toUtc(from)) / 86400000);
}

interface DueRow {
  profile_id: number;
  profile_name: string;
  profile_type: VaccineProfileType;
  vaccine_id: number;
  vaccine_name: string;
  disease_name: string;
  total_doses: number | null;
  dose_id: number;
  dose_number: number;
  due_date: string;
  location: string | null;
  note: string | null;
}

/**
 * Upcoming doses (1..7 days out) for followed vaccines of active accounts, when the
 * VACCINE feature is on. Mirrors getNextDue() in routes/vaccines.ts: planned doses
 * first; next_dose_date only when the vaccine has no planned dose at all.
 */
function findDueDoses(today: string): DueRow[] {
  const from = addDays(today, 1);
  const to = addDays(today, MAX_DAYS);
  const featureOn =
    (db.prepare("SELECT enabled FROM feature_flags WHERE key = 'VACCINE'").get() as { enabled: number } | undefined)
      ?.enabled !== 0;
  if (!featureOn) return [];

  return db
    .prepare(
      `SELECT p.id AS profile_id, p.name AS profile_name, p.profile_type,
              v.id AS vaccine_id, v.vaccine_name, v.disease_name, v.total_doses,
              d.id AS dose_id, d.dose_number, d.date AS due_date, d.location, d.note
         FROM vaccine_doses d
         JOIN vaccines v ON v.id = d.vaccine_id
         JOIN vaccine_profiles p ON p.id = v.profile_id AND p.account = v.account
         JOIN accounts a ON a.id = v.account AND a.is_active = 1
        WHERE d.planned = 1 AND v.followed = 1 AND d.date BETWEEN ? AND ?
       UNION ALL
       SELECT p.id, p.name, p.profile_type,
              v.id, v.vaccine_name, v.disease_name, v.total_doses,
              0, (SELECT COUNT(*) FROM vaccine_doses x WHERE x.vaccine_id = v.id AND x.planned = 0) + 1,
              v.next_dose_date, NULL, NULL
         FROM vaccines v
         JOIN vaccine_profiles p ON p.id = v.profile_id AND p.account = v.account
         JOIN accounts a ON a.id = v.account AND a.is_active = 1
        WHERE v.followed = 1 AND v.next_dose_date BETWEEN ? AND ?
          AND NOT EXISTS (SELECT 1 FROM vaccine_doses y WHERE y.vaccine_id = v.id AND y.planned = 1)
        ORDER BY 1, 10`
    )
    .all(from, to, from, to) as unknown as DueRow[];
}

/** Re-read at send time on purpose: the profile's recipient list may have just changed. */
function getProfileEmails(profileId: number): string[] {
  const row = db.prepare("SELECT reminder_emails FROM vaccine_profiles WHERE id = ?").get(profileId) as
    | { reminder_emails: string | null }
    | undefined;
  if (!row?.reminder_emails) return [];
  try {
    const parsed = JSON.parse(row.reminder_emails);
    return Array.isArray(parsed) ? parsed.filter((e): e is string => typeof e === "string") : [];
  } catch {
    return [];
  }
}

function alreadySent(vaccineId: number, doseId: number, dueDate: string, tier: number): boolean {
  return !!db
    .prepare("SELECT 1 FROM vaccine_reminder_logs WHERE vaccine_id = ? AND dose_id = ? AND due_date = ? AND tier = ?")
    .get(vaccineId, doseId, dueDate, tier);
}

export function getAppPublicUrl(): string {
  return process.env.APP_PUBLIC_URL?.trim() || "https://quytitans.com/laclac/";
}

export interface ReminderRunSummary {
  today: string;
  profilesEmailed: number;
  dosesReminded: number;
  recipientsSent: number;
  recipientsFailed: number;
  skippedNoEmail: number;
  errors: string[];
  /** Filled in dry-run mode: what would have been sent. */
  preview: { profileId: number; to: string[]; subject: string; doses: { vaccine: string; date: string; tier: number }[] }[];
}

/**
 * One pass of the daily reminder job. Safe to call more than once a day: every
 * (dose, due_date, tier) is emailed at most once, enforced by vaccine_reminder_logs.
 *
 * All doses of the same profile that need a reminder today go out in ONE email.
 */
export async function runVaccineReminders(opts: { today?: string; dryRun?: boolean } = {}): Promise<ReminderRunSummary> {
  const today = opts.today ?? todayStr();
  const summary: ReminderRunSummary = {
    today,
    profilesEmailed: 0,
    dosesReminded: 0,
    recipientsSent: 0,
    recipientsFailed: 0,
    skippedNoEmail: 0,
    errors: [],
    preview: [],
  };

  const byProfile = new Map<number, { name: string; type: VaccineProfileType; items: (DueRow & { tier: number; daysLeft: number })[] }>();
  for (const row of findDueDoses(today)) {
    const daysLeft = diffDays(today, row.due_date);
    const tier = tierFor(daysLeft);
    if (tier == null || alreadySent(row.vaccine_id, row.dose_id, row.due_date, tier)) continue;
    const group = byProfile.get(row.profile_id) ?? { name: row.profile_name, type: row.profile_type, items: [] };
    group.items.push({ ...row, tier, daysLeft });
    byProfile.set(row.profile_id, group);
  }

  const insertLog = db.prepare(
    `INSERT OR IGNORE INTO vaccine_reminder_logs
       (profile_id, vaccine_id, dose_id, due_date, tier, recipients_sent, recipients_failed, sent_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (const [profileId, group] of byProfile) {
    const emails = getProfileEmails(profileId);
    if (emails.length === 0) {
      summary.skippedNoEmail++;
      continue;
    }
    group.items.sort((a, b) => a.due_date.localeCompare(b.due_date));
    const doses: ReminderDose[] = group.items.map((r) => ({
      vaccineName: r.vaccine_name,
      diseaseName: r.disease_name,
      doseNumber: r.dose_number,
      totalDoses: r.total_doses,
      date: r.due_date,
      daysLeft: r.daysLeft,
      location: r.location,
      note: r.note,
    }));
    const input = { profileName: group.name, profileType: group.type, doses, appUrl: getAppPublicUrl() };
    const subject = buildReminderSubject(input);

    if (opts.dryRun) {
      summary.preview.push({
        profileId,
        to: emails,
        subject,
        doses: group.items.map((r) => ({ vaccine: r.vaccine_name, date: r.due_date, tier: r.tier })),
      });
      continue;
    }

    try {
      const result = await sendMail({
        title: subject,
        to: emails,
        html: buildReminderHtml(input),
        text: buildReminderText(input),
      });
      summary.recipientsSent += result.sent;
      summary.recipientsFailed += result.failed;
      if (result.sent > 0) {
        const now = new Date().toISOString();
        for (const r of group.items) {
          insertLog.run(profileId, r.vaccine_id, r.dose_id, r.due_date, r.tier, result.sent, result.failed, now);
        }
        summary.profilesEmailed++;
        summary.dosesReminded += group.items.length;
      }
      if (result.failed > 0) {
        // Only addresses + error text — never mail content or credentials.
        const failedList = result.results.filter((r) => !r.ok).map((r) => `${r.to}: ${r.error}`).join("; ");
        const msg = `Sổ #${profileId}: gửi lỗi ${result.failed}/${result.results.length} — ${failedList}`;
        summary.errors.push(msg);
        logError(JOB_ROUTE, 500, msg);
      }
    } catch (err) {
      const msg = `Sổ #${profileId}: ${err instanceof Error ? err.message : String(err)}`;
      summary.errors.push(msg);
      logError(JOB_ROUTE, 500, msg);
      // Bad credentials will fail every profile the same way — stop early.
      if (msg.includes("Gmail từ chối đăng nhập")) break;
    }
  }

  return summary;
}
