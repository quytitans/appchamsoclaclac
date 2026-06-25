import { useState } from "react";
import AppHeader from "../components/AppHeader";
import DiaryTimeline from "../components/DiaryTimeline";
import DiaryWriteForm from "../components/DiaryWriteForm";
import type { Session } from "../types";
import type { Screen } from "../App";

interface Props {
  session: Session;
  onNavigate: (screen: Screen) => void;
}

export default function DiaryScreen({ session, onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<"timeline" | "write">("timeline");
  const [refreshKey, setRefreshKey] = useState(0);

  function handleSaved() {
    setRefreshKey((k) => k + 1);
    setActiveTab("timeline");
  }

  return (
    <div className="screen diary-screen">
      <AppHeader onGoHome={() => onNavigate("HOME")} />
      <header className="screen-header">
        <button className="back-button" onClick={() => onNavigate("HOME")}>
          ←
        </button>
        <h2>Nhật Ký Của Mẹ</h2>
        <button className="nav-switch-button" onClick={() => onNavigate("HOME")}>
          🏠 Trang chủ
        </button>
      </header>

      <div className="stats-tabs">
        <button
          className={`stats-tab ${activeTab === "timeline" ? "active" : ""}`}
          onClick={() => setActiveTab("timeline")}
        >
          Nhật Ký Của Mẹ
        </button>
        <button
          className={`stats-tab ${activeTab === "write" ? "active" : ""}`}
          onClick={() => setActiveTab("write")}
        >
          Viết Nhật Ký
        </button>
      </div>

      {activeTab === "timeline" && <DiaryTimeline account={session.account} refreshKey={refreshKey} />}
      {activeTab === "write" && <DiaryWriteForm account={session.account} onSaved={handleSaved} />}
    </div>
  );
}
