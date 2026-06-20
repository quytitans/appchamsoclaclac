import { useState } from "react";
import type { Screen } from "../App";
import ChangePinModal from "../components/ChangePinModal";

interface Props {
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
}

export default function HomeScreen({ onNavigate, onLogout }: Props) {
  const [showChangePin, setShowChangePin] = useState(false);

  return (
    <div className="screen home-screen">
      <div className="home-corner-actions">
        <button className="change-pin-button" onClick={() => setShowChangePin(true)}>
          🔒 Đổi Pass
        </button>
        <button className="change-pin-button logout-button" onClick={onLogout}>
          🚪 Đăng Xuất
        </button>
      </div>

      <div className="home-hero">
        <div className="home-emoji">🍼</div>
        <h1 className="app-title">Lạc Lạc Bé Yêu</h1>
        <p className="app-subtitle">Ghi nhật ký mỗi ngày của bé</p>
      </div>

      <div className="home-actions">
        <button className="big-card-button" onClick={() => onNavigate("NOTE")}>
          <span className="big-card-icon">📝</span>
          <span className="big-card-label">Note Thông Tin</span>
        </button>
        <button className="big-card-button" onClick={() => onNavigate("STATS")}>
          <span className="big-card-icon">📊</span>
          <span className="big-card-label">Xem Thống Kê</span>
        </button>
      </div>

      {showChangePin && <ChangePinModal onClose={() => setShowChangePin(false)} />}
    </div>
  );
}
