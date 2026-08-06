import { useEffect, useMemo, useState } from "react";
import type { GrowthRecord } from "../types";
import { formatDateVN, todayDateStr } from "../dateUtils";

interface Props {
  records: GrowthRecord[];
}

type ViewMode = "day" | "month" | "year" | "custom";

interface ChartPoint {
  key: string;
  label: string;
  date: string;
  milestoneLabel: string | null;
  weight: number | null;
  height: number | null;
}

const WEIGHT_COLOR = "#4a3aa7";
const HEIGHT_COLOR = "#e0467a";

const VIEW_OPTIONS: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Theo Ngày" },
  { value: "month", label: "Theo Tháng" },
  { value: "year", label: "Theo Năm" },
  { value: "custom", label: "Tùy Chọn" },
];

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function monthLabel(dateStr: string): string {
  const [y, m] = dateStr.split("-");
  return `Th${Number(m)}/${y.slice(2)}`;
}

function yearLabel(dateStr: string): string {
  return dateStr.slice(0, 4);
}

function bucketByKey(records: GrowthRecord[], keyFn: (d: string) => string, labelFn: (d: string) => string): ChartPoint[] {
  const groups = new Map<string, GrowthRecord[]>();
  for (const r of records) {
    const key = keyFn(r.date);
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  const keys = [...groups.keys()].sort();
  return keys.map((key) => {
    const items = groups.get(key)!;
    const weights = items.map((i) => i.weight_kg).filter((v): v is number => v != null);
    const heights = items.map((i) => i.height_cm).filter((v): v is number => v != null);
    return {
      key,
      label: labelFn(key),
      date: items[items.length - 1].date,
      milestoneLabel: null,
      weight: weights.length > 0 ? avg(weights) : null,
      height: heights.length > 0 ? avg(heights) : null,
    };
  });
}

function buildPoints(records: GrowthRecord[], mode: ViewMode, from: string, to: string): ChartPoint[] {
  const sorted = [...records].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));

  if (mode === "month") return bucketByKey(sorted, (d) => d.slice(0, 7), monthLabel);
  if (mode === "year") return bucketByKey(sorted, (d) => d.slice(0, 4), yearLabel);

  const filtered = mode === "custom" ? sorted.filter((r) => r.date >= from && r.date <= to) : sorted;
  return filtered.map((r) => ({
    key: String(r.id),
    label: r.milestone_label || formatDateVN(r.date),
    date: r.date,
    milestoneLabel: r.milestone_label,
    weight: r.weight_kg,
    height: r.height_cm,
  }));
}

const WIDTH = 320;
const HEIGHT = 210;
const PAD_LEFT = 14;
const PAD_RIGHT = 14;
const PAD_TOP = 18;
const PAD_BOTTOM = 34;

function buildScale(values: (number | null)[]): (v: number) => number {
  const present = values.filter((v): v is number => v != null);
  if (present.length === 0) return () => PAD_TOP + (HEIGHT - PAD_TOP - PAD_BOTTOM) / 2;
  let min = Math.min(...present);
  let max = Math.max(...present);
  if (min === max) {
    min -= 1;
    max += 1;
  } else {
    const pad = (max - min) * 0.15;
    min -= pad;
    max += pad;
  }
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  return (v: number) => PAD_TOP + (1 - (v - min) / (max - min)) * plotHeight;
}

function buildLinePath(points: ChartPoint[], xOf: (i: number) => number, yScale: (v: number) => number, key: "weight" | "height"): string {
  let d = "";
  let drawing = false;
  points.forEach((p, i) => {
    const v = p[key];
    if (v == null) {
      drawing = false;
      return;
    }
    const x = xOf(i);
    const y = yScale(v);
    d += drawing ? ` L ${x} ${y}` : `${d ? " " : ""}M ${x} ${y}`;
    drawing = true;
  });
  return d;
}

export default function GrowthChart({ records }: Props) {
  const [mode, setMode] = useState<ViewMode>("day");
  const [customFrom, setCustomFrom] = useState(() => records[0]?.date ?? todayDateStr());
  const [customTo, setCustomTo] = useState(() => todayDateStr());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const points = useMemo(() => buildPoints(records, mode, customFrom, customTo), [records, mode, customFrom, customTo]);

  useEffect(() => {
    setActiveIndex(points.length > 0 ? points.length - 1 : null);
  }, [points.length, mode]);

  if (records.length === 0) {
    return (
      <div className="growth-chart-card">
        <p className="loading-text">Chưa có dữ liệu để vẽ biểu đồ</p>
      </div>
    );
  }

  const n = points.length;
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const xOf = (i: number) => (n <= 1 ? PAD_LEFT + plotWidth / 2 : PAD_LEFT + (i / (n - 1)) * plotWidth);

  const weightScale = buildScale(points.map((p) => p.weight));
  const heightScale = buildScale(points.map((p) => p.height));

  const weightPath = buildLinePath(points, xOf, weightScale, "weight");
  const heightPath = buildLinePath(points, xOf, heightScale, "height");

  // Tránh chữ đè nhau khi có nhiều mốc đo: chỉ hiện tối đa ~6 nhãn trục X, ưu tiên điểm đầu/cuối.
  const labelStep = n > 6 ? Math.ceil(n / 6) : 1;

  const active = activeIndex != null ? points[activeIndex] : null;

  return (
    <div className="growth-chart-card">
      <div className="growth-chart-header">
        <h3 className="month-section-title">📈 Biểu Đồ Tăng Trưởng</h3>
        <div className="growth-chart-legend">
          <span className="growth-legend-item">
            <i className="growth-legend-dot" style={{ background: WEIGHT_COLOR }} /> Cân nặng (kg)
          </span>
          <span className="growth-legend-item">
            <i className="growth-legend-dot" style={{ background: HEIGHT_COLOR }} /> Chiều cao (cm)
          </span>
        </div>
      </div>

      <div className="view-toggle growth-view-toggle">
        {VIEW_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            className={`view-toggle-btn ${mode === opt.value ? "active" : ""}`}
            onClick={() => setMode(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {mode === "custom" && (
        <div className="growth-custom-range">
          <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
          <span>đến</span>
          <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
        </div>
      )}

      {n === 0 ? (
        <p className="loading-text">Không có dữ liệu trong khoảng đã chọn</p>
      ) : (
        <>
          <svg
            className="growth-chart-svg"
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="Biểu đồ cân nặng và chiều cao theo thời gian"
          >
            {[0.25, 0.5, 0.75].map((frac) => (
              <line
                key={frac}
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={PAD_TOP + frac * (HEIGHT - PAD_TOP - PAD_BOTTOM)}
                y2={PAD_TOP + frac * (HEIGHT - PAD_TOP - PAD_BOTTOM)}
                className="growth-chart-gridline"
              />
            ))}

            {points.map((p, i) =>
              i % labelStep === 0 || i === n - 1 ? (
                <text
                  key={`label-${p.key}`}
                  x={xOf(i)}
                  y={HEIGHT - 12}
                  textAnchor="middle"
                  className="growth-chart-axis-label"
                >
                  {p.label}
                </text>
              ) : null
            )}

            {weightPath && <path d={weightPath} fill="none" stroke={WEIGHT_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}
            {heightPath && <path d={heightPath} fill="none" stroke={HEIGHT_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />}

            {points.map((p, i) =>
              p.weight != null ? (
                <circle
                  key={`w-${p.key}`}
                  cx={xOf(i)}
                  cy={weightScale(p.weight)}
                  r={activeIndex === i ? 5 : 3.5}
                  fill={WEIGHT_COLOR}
                  stroke="#fff"
                  strokeWidth={1.5}
                  onClick={() => setActiveIndex(i)}
                  className="growth-chart-point"
                />
              ) : null
            )}
            {points.map((p, i) =>
              p.height != null ? (
                <circle
                  key={`h-${p.key}`}
                  cx={xOf(i)}
                  cy={heightScale(p.height)}
                  r={activeIndex === i ? 5 : 3.5}
                  fill={HEIGHT_COLOR}
                  stroke="#fff"
                  strokeWidth={1.5}
                  onClick={() => setActiveIndex(i)}
                  className="growth-chart-point"
                />
              ) : null
            )}

            {activeIndex != null && (
              <line
                x1={xOf(activeIndex)}
                x2={xOf(activeIndex)}
                y1={PAD_TOP}
                y2={HEIGHT - PAD_BOTTOM}
                className="growth-chart-crosshair"
              />
            )}
          </svg>

          {active && (
            <div className="growth-chart-tooltip">
              <span className="growth-chart-tooltip-label">{active.milestoneLabel || active.label}</span>
              {active.weight != null && (
                <span className="growth-chart-tooltip-value">
                  <i className="growth-legend-dot" style={{ background: WEIGHT_COLOR }} />
                  {active.weight.toFixed(2)}kg
                </span>
              )}
              {active.height != null && (
                <span className="growth-chart-tooltip-value">
                  <i className="growth-legend-dot" style={{ background: HEIGHT_COLOR }} />
                  {active.height.toFixed(1)}cm
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
