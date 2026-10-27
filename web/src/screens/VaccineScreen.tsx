import { useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import VaccineForm from "../components/VaccineForm";
import VaccineList from "../components/VaccineList";
import VaccineProfilePicker from "../components/VaccineProfilePicker";
import { fetchLatestGrowth, fetchUpcomingDoses } from "../api";
import { formatDateVN } from "../dateUtils";
import { colorIndexForId } from "../colorUtils";
import { profileIcon, profileTypeLabel } from "../vaccineProfileMeta";
import type { LatestGrowth, Session, UpcomingDose, VaccineProfile } from "../types";
import type { Screen } from "../App";

interface Props {
  session: Session;
  onNavigate: (screen: Screen) => void;
}

interface FocusRequest {
  vaccineId: number;
  nonce: number;
}

export default function VaccineScreen({ session, onNavigate }: Props) {
  const [profile, setProfile] = useState<VaccineProfile | null>(null);
  const [activeTab, setActiveTab] = useState<"entry" | "book">("book");
  const [entryKey, setEntryKey] = useState(0);
  const [growth, setGrowth] = useState<LatestGrowth | null>(null);
  const [upcomingDoses, setUpcomingDoses] = useState<UpcomingDose[]>([]);
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null);

  const isBaby = profile?.profileType === "baby";

  useEffect(() => {
    if (!profile || !isBaby) {
      setGrowth(null);
      return;
    }
    fetchLatestGrowth(session.account)
      .then(setGrowth)
      .catch(() => {});
  }, [session.account, profile, isBaby]);

  useEffect(() => {
    if (!profile) return;
    fetchUpcomingDoses(session.account, profile.id)
      .then(setUpcomingDoses)
      .catch(() => {});
  }, [session.account, profile, activeTab]);

  function handleSwitchTab(tab: "entry" | "book") {
    if (tab === "entry") setEntryKey((k) => k + 1);
    setActiveTab(tab);
  }

  function handleSelectProfile(p: VaccineProfile) {
    setProfile(p);
    setActiveTab("book");
  }

  return (
    <div className="screen vaccine-screen">
      <AppHeader onGoHome={() => onNavigate("HOME")} />
      <header className="screen-header">
        <button
          className="back-button"
          onClick={() => (profile ? setProfile(null) : onNavigate("HOME"))}
        >
          ←
        </button>
        <h2>Sổ Tiêm Chủng Online</h2>
        <button className="nav-switch-button" onClick={() => onNavigate("HOME")}>
          🏠 Trang chủ
        </button>
      </header>

      {!profile ? (
        <VaccineProfilePicker account={session.account} onSelect={handleSelectProfile} />
      ) : (
        <>
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
              <div className="baby-info-header">
                <span className="baby-info-avatar">{profileIcon(profile.profileType)}</span>
                <span className="baby-info-name">{profile.name}</span>
                <span className="baby-info-divider">•</span>
                <span className="baby-info-stat-inline">{profileTypeLabel(profile.profileType)}</span>
                {isBaby && (
                  <>
                    <span className="baby-info-divider">•</span>
                    <span className="baby-info-stat-inline">
                      📏 {growth?.heightCm != null ? `${growth.heightCm}cm` : "—"}
                    </span>
                    <span className="baby-info-divider">•</span>
                    <span className="baby-info-stat-inline">
                      ⚖️ {growth?.weightKg != null ? `${growth.weightKg}kg` : "—"}
                    </span>
                  </>
                )}
                <button
                  type="button"
                  className="nav-switch-button vaccine-switch-profile-button"
                  onClick={() => setProfile(null)}
                >
                  📔 Đổi sổ
                </button>
              </div>
              {upcomingDoses.length > 0 && (
                <div className="upcoming-doses-block">
                  <div className="upcoming-doses-title">💉 Các mũi tiêm tiếp theo</div>
                  <div className="upcoming-doses-list">
                    {upcomingDoses.map((d) => (
                      <button
                        key={d.vaccineId}
                        type="button"
                        className={`upcoming-dose-item upcoming-dose-color-${colorIndexForId(d.vaccineId)} ${
                          d.overdue ? "overdue" : ""
                        }`}
                        onClick={() => setFocusRequest({ vaccineId: d.vaccineId, nonce: Date.now() })}
                      >
                        <span className="upcoming-dose-icon">{d.overdue ? "⚠️" : "📅"}</span>
                        <div className="upcoming-dose-text">
                          <span className="upcoming-dose-name">{d.vaccineName}</span>
                          <span className="upcoming-dose-num">Mũi {d.doseNumber}</span>
                        </div>
                        <span className="upcoming-dose-date">{formatDateVN(d.date)}</span>
                      </button>
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
              profileId={profile.id}
              onConfirmedSaved={() => setActiveTab("book")}
            />
          )}
          {activeTab === "book" && (
            <VaccineList account={session.account} profileId={profile.id} focusRequest={focusRequest} />
          )}
        </>
      )}
    </div>
  );
}
