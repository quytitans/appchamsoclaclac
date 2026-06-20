import { Router } from "express";
import { db } from "../db/index.js";

export const statsRouter = Router();

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function computeAvgIntervalMinutes(times: string[]): number | null {
  if (times.length < 2) return null;
  const minutes = times
    .map((t) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    })
    .sort((a, b) => a - b);
  let totalGap = 0;
  for (let i = 1; i < minutes.length; i++) totalGap += minutes[i] - minutes[i - 1];
  return totalGap / (minutes.length - 1);
}

function getLatestWeightOnOrBefore(dateStr: string): number | null {
  const row = db
    .prepare(
      `SELECT weight_kg FROM records
       WHERE type = 'can_nang' AND weight_kg IS NOT NULL AND date <= ?
       ORDER BY date DESC, created_at DESC LIMIT 1`
    )
    .get(dateStr) as { weight_kg: number } | undefined;
  return row ? row.weight_kg : null;
}

statsRouter.get("/", (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  const pumping = db
    .prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(volume_ml), 0) AS total FROM records WHERE type = 'hut_sua' AND date = ?`)
    .get(date) as { count: number; total: number };

  const breastfeed = db
    .prepare(`SELECT COUNT(*) AS count FROM records WHERE type = 'ti_me' AND date = ?`)
    .get(date) as { count: number };

  const bottle = db
    .prepare(`SELECT COUNT(*) AS count, COALESCE(SUM(volume_ml), 0) AS total FROM records WHERE type = 'ti_binh' AND date = ?`)
    .get(date) as { count: number; total: number };

  const poop = db
    .prepare(`SELECT COUNT(*) AS count FROM records WHERE type = 'di_nang' AND date = ?`)
    .get(date) as { count: number };

  const pee = db
    .prepare(`SELECT COUNT(*) AS count FROM records WHERE type = 'di_nhe' AND date = ?`)
    .get(date) as { count: number };

  const feedingTimes = db
    .prepare(`SELECT time FROM records WHERE date = ? AND type IN ('ti_me', 'ti_binh') AND time IS NOT NULL`)
    .all(date) as { time: string }[];
  const avgFeedingIntervalMinutes = computeAvgIntervalMinutes(feedingTimes.map((r) => r.time));

  const currentWeight = getLatestWeightOnOrBefore(date);
  const weightAWeekAgo = getLatestWeightOnOrBefore(shiftDate(date, -7));
  const weightAMonthAgo = getLatestWeightOnOrBefore(shiftDate(date, -30));

  res.json({
    date,
    pumping: {
      count: pumping.count,
      totalMl: pumping.total,
      avgMl: pumping.count > 0 ? pumping.total / pumping.count : 0,
    },
    breastfeed: { count: breastfeed.count },
    bottle: {
      count: bottle.count,
      totalMl: bottle.total,
      avgMl: bottle.count > 0 ? bottle.total / bottle.count : 0,
    },
    poop: { count: poop.count },
    pee: { count: pee.count },
    feeding: {
      avgIntervalMinutes: avgFeedingIntervalMinutes,
      avgMl: bottle.count > 0 ? bottle.total / bottle.count : 0,
    },
    weight: {
      current: currentWeight,
      deltaWeek: currentWeight != null && weightAWeekAgo != null ? currentWeight - weightAWeekAgo : null,
      deltaMonth: currentWeight != null && weightAMonthAgo != null ? currentWeight - weightAMonthAgo : null,
    },
  });
});
