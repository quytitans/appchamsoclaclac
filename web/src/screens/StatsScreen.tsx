import { useCallback, useEffect, useRef, useState } from "react";
import { fetchRecords, fetchStats } from "../api";
import { formatDateVN, shiftDateStr, todayDateStr } from "../dateUtils";
import type { RecordItem, Session, StatsResponse } from "../types";
import AppHeader from "../components/AppHeader";
import TimelineGrid from "../components/TimelineGrid";
import EditRecordModal from "../components/EditRecordModal";
import MonthView from "./MonthView";
import type { Screen } from "../App";

interface Props {
  session: Session;
  onNavigate: (screen: Screen) => void;
}

interface KpiLine {
  icon: string;
  text: string;
}

export default function StatsScreen({ session, onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<"day" | "month">("day");
  const [date, setDate] = useState(todayDateStr());
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState<RecordItem | null>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  function openDatePicker() {
    const el = dateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      el.showPicker();
    } else {
      el.click();
    }
  }

  const loadData = useCallback(() => {
    setLoading(true);
    return Promise.all([fetchStats(date, session.account), fetchRecords(date, session.account)])
      .then(([statsRes, recordsRes]) => {
        setStats(statsRes);
        setRecords(recordsRes);
      })
      .finally(() => setLoading(false));
  }, [date, session.account]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="screen stats-screen">
      <AppHeader onGoHome={() => onNavigate("HOME")} />
      <header className="screen-header">
        <button className="back-button" onClick={() => onNavigate("HOME")}>
          ←
        </button>
        <h2>Xem Thống Kê</h2>
        <button className="nav-switch-button" onClick={() => onNavigate("NOTE")}>
          📝 Note
        </button>
      </header>

      <div className="stats-tabs">
        <button
          className={`stats-tab ${activeTab === "day" ? "active" : ""}`}
          onClick={() => setActiveTab("day")}
        >
          View Theo Ngày
        </button>
        <button
          className={`stats-tab ${activeTab === "month" ? "active" : ""}`}
          onClick={() => setActiveTab("month")}
        >
          View Theo Tháng
        </button>
      </div>

      {activeTab === "month" && (
        <MonthView
          account={session.account}
          onSelectDate={(dateStr) => {
            setDate(dateStr);
            setActiveTab("day");
          }}
        />
      )}

      {activeTab === "day" && (
        <>
          <div className="date-filter">
            <label>Ngày xem</label>
            <div className="date-nav">
              <button className="date-nav-button" onClick={() => setDate((d) => shiftDateStr(d, -1))}>
                ‹
              </button>
              <div className="date-display-wrapper" onClick={openDatePicker}>
                <span className="date-display-text">{formatDateVN(date)}</span>
                <input
                  ref={dateInputRef}
                  type="date"
                  className="date-display-hidden-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
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
              </section>

              <TimelineGrid records={records} onSelectRecord={setEditingRecord} />
            </>
          )}
        </>
      )}

      {editingRecord && (
        <EditRecordModal
          key={editingRecord.id}
          record={editingRecord}
          account={session.account}
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

function formatInterval(minutes: number | null): string {
  if (minutes == null) return "Chưa đủ dữ liệu";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

function highlightNumbers(text: string) {
  const match = text.match(/-?\d+(\.\d+)?/);
  if (!match || match.index == null) return text;
  const before = text.slice(0, match.index);
  const after = text.slice(match.index + match[0].length);
  return (
    <>
      {before}
      <span className="kpi-value">{match[0]}</span>
      {after}
    </>
  );
}

function KpiCard({ icon, title, lines }: { icon: string; title: string; lines: KpiLine[] }) {
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-title">{title}</div>
      {lines.map((line, idx) => (
        <div key={idx} className="kpi-line">
          <span className="kpi-line-icon">{line.icon}</span>
          {highlightNumbers(line.text)}
        </div>
      ))}
    </div>
  );
}
