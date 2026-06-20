import { useCallback, useEffect, useState } from "react";
import { fetchRecords, fetchStats } from "../api";
import { shiftDateStr, todayDateStr } from "../dateUtils";
import type { RecordItem, StatsResponse } from "../types";
import TimelineGrid from "../components/TimelineGrid";
import EditRecordModal from "../components/EditRecordModal";
import type { Screen } from "../App";

interface Props {
  onNavigate: (screen: Screen) => void;
}

interface KpiLine {
  icon: string;
  text: string;
}

export default function StatsScreen({ onNavigate }: Props) {
  const [date, setDate] = useState(todayDateStr());
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    return Promise.all([fetchStats(date), fetchRecords(date)])
      .then(([statsRes, recordsRes]) => {
        setStats(statsRes);
        setRecords(recordsRes);
      })
      .finally(() => setLoading(false));
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="screen stats-screen">
      <header className="screen-header">
        <button className="back-button" onClick={() => onNavigate("HOME")}>
          ←
        </button>
        <h2>Xem Thống Kê</h2>
        <button className="nav-switch-button" onClick={() => onNavigate("NOTE")}>
          📝 Note
        </button>
      </header>

      <div className="date-filter">
        <label>Ngày xem</label>
        <div className="date-nav">
          <button className="date-nav-button" onClick={() => setDate((d) => shiftDateStr(d, -1))}>
            ‹
          </button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="date-nav-button" onClick={() => setDate((d) => shiftDateStr(d, 1))}>
            ›
          </button>
        </div>
      </div>

      {loading && <p className="loading-text">Đang tải...</p>}

      {!loading && stats && (
        <>
          <section className="kpi-grid">
            <KpiCard
              icon="🍼"
              title="Hút sữa"
              lines={[
                { icon: "🔹", text: `${stats.pumping.count} lần` },
                { icon: "💧", text: `${stats.pumping.totalMl} ml` },
                { icon: "✨", text: `Trung Bình ${stats.pumping.avgMl.toFixed(0)} ml/lần` },
              ]}
            />
            <KpiCard
              icon="🍽️"
              title="Bé Ăn"
              lines={[
                { icon: "🤱", text: `${stats.breastfeed.count} lần ti mẹ` },
                { icon: "🍼", text: `${stats.bottle.count} lần ti bình | ${stats.bottle.totalMl} ml` },
                { icon: "✨", text: `Trung Bình ${stats.bottle.avgMl.toFixed(0)} ml/lần ti bình` },
                { icon: "⏰", text: `Cách nhau TB: ${formatInterval(stats.feeding.avgIntervalMinutes)}` },
              ]}
            />
            <KpiCard
              icon="🧷"
              title="Vệ sinh"
              lines={[
                { icon: "💩", text: `${stats.poop.count} lần đi nặng` },
                { icon: "💦", text: `${stats.pee.count} lần đi nhẹ` },
              ]}
            />
            <KpiCard
              icon="⚖️"
              title="Cân nặng"
              lines={[
                {
                  icon: "⚖️",
                  text: stats.weight.current != null ? `${stats.weight.current} kg` : "Chưa có dữ liệu",
                },
                { icon: "📈", text: `Tuần qua: ${formatDelta(stats.weight.deltaWeek)}` },
                { icon: "📈", text: `Tháng qua: ${formatDelta(stats.weight.deltaMonth)}` },
              ]}
            />
          </section>

          <TimelineGrid records={records} onSelectRecord={setEditingRecord} />
        </>
      )}

      {editingRecord && (
        <EditRecordModal
          key={editingRecord.id}
          record={editingRecord}
          onClose={() => setEditingRecord(null)}
          onUpdated={() => {
            setEditingRecord(null);
            loadData();
          }}
          onDeleted={() => {
            setEditingRecord(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function formatDelta(delta: number | null): string {
  if (delta == null) return "Chưa có dữ liệu";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(2)} kg`;
}

function formatInterval(minutes: number | null): string {
  if (minutes == null) return "Chưa đủ dữ liệu";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

function KpiCard({ icon, title, lines }: { icon: string; title: string; lines: KpiLine[] }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-title">{title}</div>
      {lines.map((line, idx) => (
        <div key={idx} className="kpi-line">
          <span className="kpi-line-icon">{line.icon}</span>
          {line.text}
        </div>
      ))}
    </div>
  );
}
