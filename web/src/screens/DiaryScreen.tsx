import { useState } from "react";
import AppHeader from "../components/AppHeader";
import DiaryTimeline from "../components/DiaryTimeline";
import DiaryWriteForm from "../components/DiaryWriteForm";
import BabyFaceTimeline from "../components/BabyFaceTimeline";
import type { Session } from "../types";
import type { Screen } from "../App";

interface Props {
  session: Session;
  onNavigate: (screen: Screen) => void;
}

export default function DiaryScreen({ session, onNavigate }: Props) {
  const [activeTab, setActiveTab] = useState<"timeline" | "write" | "face">("timeline");
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
        <button
          className={`stats-tab ${activeTab === "face" ? "active" : ""}`}
          onClick={() => setActiveTab("face")}
        >
          ✨ The Face
        </button>
      </div>

      {activeTab === "timeline" && <DiaryTimeline session={session} refreshKey={refreshKey} />}
      {activeTab === "write" && <DiaryWriteForm session={session} onSaved={handleSaved} />}
      {activeTab === "face" && <BabyFaceTimeline session={session} />}
    </div>
  );
}
