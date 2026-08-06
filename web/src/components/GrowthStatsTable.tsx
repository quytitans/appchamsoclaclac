import type { GrowthRecord } from "../types";
import { formatDateVN } from "../dateUtils";

interface Props {
  records: GrowthRecord[];
  onSelectRecord: (record: GrowthRecord) => void;
}

interface Row {
  record: GrowthRecord;
  label: string;
  weightText: string;
  growthText: string;
  heightText: string;
  trend: "up" | "down" | "flat" | "none";
}

function buildRows(records: GrowthRecord[]): Row[] {
  const sorted = [...records].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
  let prevWeight: number | null = null;

  return sorted.map((record) => {
    const label = record.milestone_label || formatDateVN(record.date);
    const weightText = record.weight_kg != null ? `${record.weight_kg}kg` : "—";
    const heightText = record.height_cm != null ? `${record.height_cm}cm` : "—";

    let growthText = "—";
    let trend: Row["trend"] = "none";

    if (record.weight_kg != null && prevWeight != null) {
      const delta = record.weight_kg - prevWeight;
      const rounded = Math.round(delta * 100) / 100;
      if (rounded > 0) {
        growthText = `Tăng ${rounded}kg`;
        trend = "up";
      } else if (rounded < 0) {
        growthText = `Giảm ${Math.abs(rounded)}kg`;
        trend = "down";
      } else {
        growthText = "Không đổi";
        trend = "flat";
      }
    }

    if (record.weight_kg != null) prevWeight = record.weight_kg;

    return { record, label, weightText, growthText, heightText, trend };
  });
}

const TREND_ICON: Record<Row["trend"], string> = {
  up: "▲",
  down: "▼",
  flat: "▶",
  none: "—",
};

export default function GrowthStatsTable({ records, onSelectRecord }: Props) {
  if (records.length === 0) {
    return (
      <div className="growth-table-card">
        <p className="loading-text">Chưa có số đo nào — hãy nhập ở tab "Nhập Thông Tin"</p>
      </div>
    );
  }

  const rows = buildRows(records);

  return (
    <div className="growth-table-card">
      <div className="growth-table-scroll">
        <table className="growth-table">
          <thead>
            <tr>
              <th>Mốc Đo</th>
              <th>Cân Nặng</th>
              <th>Tăng Trưởng</th>
              <th>Chiều Cao</th>
              <th>Xu Hướng</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.record.id} onClick={() => onSelectRecord(row.record)}>
                <td className="growth-table-label">{row.label}</td>
                <td>{row.weightText}</td>
                <td className="growth-table-growth">{row.growthText}</td>
                <td>{row.heightText}</td>
                <td>
                  <span className={`growth-trend growth-trend-${row.trend}`}>{TREND_ICON[row.trend]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
