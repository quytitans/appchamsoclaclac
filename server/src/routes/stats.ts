import { Router } from "express";
import { db } from "../db/index.js";
import type { RecordRow } from "../types.js";

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

statsRouter.get("/month", (req, res) => {
  const month = req.query.month as string | undefined;
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "Thiếu hoặc sai tham số month (định dạng YYYY-MM)" });
    return;
  }

  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const firstDay = `${month}-01`;
  const lastDay = `${month}-${String(daysInMonth).padStart(2, "0")}`;

  const rows = db
    .prepare(`SELECT * FROM records WHERE date BETWEEN ? AND ?`)
    .all(firstDay, lastDay) as unknown as RecordRow[];

  const byDate = new Map<string, RecordRow[]>();
  for (const row of rows) {
    const list = byDate.get(row.date);
    if (list) list.push(row);
    else byDate.set(row.date, [row]);
  }

  const days = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${month}-${String(d).padStart(2, "0")}`;
    const dayRecords = byDate.get(dateStr) ?? [];
    const feedCount = dayRecords.filter((r) => r.type === "ti_me" || r.type === "ti_binh").length;
    const bottleRecords = dayRecords.filter((r) => r.type === "ti_binh" && r.volume_ml != null);
    const bottleMl = bottleRecords.reduce((sum, r) => sum + (r.volume_ml ?? 0), 0);
    const bottleAvgMl = bottleRecords.length > 0 ? bottleMl / bottleRecords.length : 0;
    const weightRecords = dayRecords.filter((r) => r.type === "can_nang" && r.weight_kg != null);
    const heightRecords = dayRecords.filter((r) => r.type === "chieu_cao" && r.height_cm != null);

    days.push({
      date: dateStr,
      feedCount,
      bottleMl,
      bottleAvgMl,
      weightKg: weightRecords.length > 0 ? weightRecords[weightRecords.length - 1].weight_kg : null,
      heightCm: heightRecords.length > 0 ? heightRecords[heightRecords.length - 1].height_cm : null,
    });
  }

  const weeklyGrowth: { label: string; deltaKg: number | null }[] = [];
  for (let start = 1; start <= daysInMonth; start += 7) {
    const end = Math.min(start + 6, daysInMonth);
    const endDate = `${month}-${String(end).padStart(2, "0")}`;
    const startDate = `${month}-${String(start).padStart(2, "0")}`;
    const weightAtEnd = getLatestWeightOnOrBefore(endDate);
    const weightBeforeStart = getLatestWeightOnOrBefore(shiftDate(startDate, -1));
    weeklyGrowth.push({
      label: `Tuần ${Math.ceil(start / 7)} (${start}-${end})`,
      deltaKg: weightAtEnd != null && weightBeforeStart != null ? weightAtEnd - weightBeforeStart : null,
    });
  }

  const weightAtMonthEnd = getLatestWeightOnOrBefore(lastDay);
  const weightBeforeMonth = getLatestWeightOnOrBefore(shiftDate(firstDay, -1));
  const monthlyGrowthKg =
    weightAtMonthEnd != null && weightBeforeMonth != null ? weightAtMonthEnd - weightBeforeMonth : null;

  res.json({ month, days, weeklyGrowth, monthlyGrowthKg });
});
