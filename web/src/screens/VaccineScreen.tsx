import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import VaccineForm from "../components/VaccineForm";
import VaccineList from "../components/VaccineList";
import { fetchLatestGrowth, fetchUpcomingDoses } from "../api";
import { formatDateVN } from "../dateUtils";
import type { LatestGrowth, Session, UpcomingDose } from "../types";
import type { Screen } from "../App";

interface Props {
  session: Session;
  onNavigate: (screen: Screen) => void;
}

export default function VaccineScreen({ session, onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<"entry" | "book">("book");
  const [entryKey, setEntryKey] = useState(0);
  const [growth, setGrowth] = useState<LatestGrowth | null>(null);
  const [upcomingDoses, setUpcomingDoses] = useState<UpcomingDose[]>([]);

  useEffect(() => {
    fetchLatestGrowth(session.account)
      .then(setGrowth)
      .catch(() => {});
  }, [session.account]);

  useEffect(() => {
    fetchUpcomingDoses(session.account)
      .then(setUpcomingDoses)
      .catch(() => {});
  }, [session.account, activeTab]);

  function handleSwitchTab(tab: "entry" | "book") {
    if (tab === "entry") setEntryKey((k) => k + 1);
    setActiveTab(tab);
  }

  return (
    <div className="screen vaccine-screen">
      <AppHeader onGoHome={() => onNavigate("HOME")} />
      <header className="screen-header">
        <button className="back-button" onClick={() => onNavigate("HOME")}>
          ←
        </button>
        <h2>Sổ Tiêm Chủng Online</h2>
        <button className="nav-switch-button" onClick={() => onNavigate("HOME")}>
          🏠 Trang chủ
        </button>
      </header>

      <div className="stats-tabs">
        <button
          className={`stats-tab ${activeTab === "entry" ? "active" : ""}`}
          onClick={() => handleSwitchTab("entry")}
        >
          Nhập Liệu
        </button>
        <button
          className={`stats-tab ${activeTab === "book" ? "active" : ""}`}
          onClick={() => handleSwitchTab("book")}
        >
          Sổ Tiêm Chủng
        </button>
      </div>

      {activeTab === "book" && (
        <section className="month-section baby-info-card">
          <div className="kpi-line">
            <span className="kpi-line-icon">👶</span>
            Tên em bé: <span className="kpi-value">{session.babyName}</span>
          </div>
          <div className="kpi-line">
            <span className="kpi-line-icon">📏</span>
            Chiều cao:{" "}
            <span className="kpi-value">{growth?.heightCm != null ? `${growth.heightCm} cm` : "Chưa có dữ liệu"}</span>
          </div>
          <div className="kpi-line">
            <span className="kpi-line-icon">⚖️</span>
            Cân nặng:{" "}
            <span className="kpi-value">{growth?.weightKg != null ? `${growth.weightKg} kg` : "Chưa có dữ liệu"}</span>
          </div>
          {upcomingDoses.length > 0 && (
            <div className="upcoming-doses-block">
              <div className="upcoming-doses-title">💉 Các mũi tiêm tiếp theo</div>
              <div className="upcoming-doses-table">
                {upcomingDoses.map((d) => (
                  <div key={d.vaccineId} className={`upcoming-dose-row ${d.overdue ? "overdue" : ""}`}>
                    <span className="upcoming-dose-name">
                      {d.overdue ? "⚠️" : "📅"} {d.vaccineName}
                    </span>
                    <span className="upcoming-dose-num">Mũi {d.doseNumber}</span>
                    <span className="upcoming-dose-date">{formatDateVN(d.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === "entry" && (
        <VaccineForm
          key={entryKey}
          account={session.account}
          onConfirmedSaved={() => setActiveTab("book")}
        />
      )}
      {activeTab === "book" && <VaccineList account={session.account} />}
    </div>
  );
}
