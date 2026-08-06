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

    let trend: Row["trend"] = "none";
    if (record.weight_kg != null && prevWeight != null) {
      const delta = Math.round((record.weight_kg - prevWeight) * 100) / 100;
      trend = delta > 0 ? "up" : delta < 0 ? "down" : "flat";
    }
    if (record.weight_kg != null) prevWeight = record.weight_kg;

    return { record, label, weightText, heightText, trend };
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
      <div className="growth-table-scroll-y">
        <table className="growth-table">
          <colgroup>
            <col style={{ width: "36%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "22%" }} />
            <col style={{ width: "20%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Mốc Đo</th>
              <th>Cân Nặng</th>
              <th>Chiều Cao</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.record.id} onClick={() => onSelectRecord(row.record)}>
                <td className="growth-table-label">{row.label}</td>
                <td>{row.weightText}</td>
                <td>{row.heightText}</td>
                <td className="growth-table-actions">
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
