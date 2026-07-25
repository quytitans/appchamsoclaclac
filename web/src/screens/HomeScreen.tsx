import { useEffect, useState } from "react";
import type { Screen } from "../App";
import type { Session } from "../types";
import ChangePinModal from "../components/ChangePinModal";
import { fetchVaccines } from "../api";

interface Props {
  session: Session;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  onSessionUpdate: (session: Session) => void;
}

export default function HomeScreen({ session, onNavigate, onLogout, onSessionUpdate }: Props) {
  const [showChangePin, setShowChangePin] = useState(false);
  const [hasOverdueVaccine, setHasOverdueVaccine] = useState(false);

  useEffect(() => {
    if (session.isAdmin) return;

    function checkOverdue() {
      fetchVaccines(session.account)
        .then((vaccines) => {
          setHasOverdueVaccine(vaccines.some((v) => v.nextDue?.overdue ?? false));
        })
        .catch(() => {});
    }

    checkOverdue();

    // Màn hình chính có thể bị bỏ mở cả ngày (khoá màn hình, chuyển app...) — chỉ fetch
    // lúc mount thôi sẽ khiến cảnh báo "đến hạn hôm nay" hiện trễ tới khi người dùng
    // vào lại/tải lại trang. Kiểm tra lại khi quay lại tab + định kỳ để badge tự cập nhật.
    function handleVisibility() {
      if (document.visibilityState === "visible") checkOverdue();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    const intervalId = window.setInterval(checkOverdue, 15 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [session.account, session.isAdmin]);

  if (session.isAdmin) {
    return (
      <div className="screen home-screen">
        <div className="home-corner-actions">
          <button className="change-pin-button logout-button" onClick={onLogout}>
            🚪 Đăng Xuất
          </button>
        </div>

        <div className="home-hero">
          <div className="home-emoji">👑</div>
          <h1 className="app-title">Admin</h1>
          <p className="app-subtitle">Trang quản trị hệ thống</p>
        </div>

        <div className="home-actions">
          <button className="big-card-button" onClick={() => onNavigate("ADMIN")}>
            <span className="big-card-icon">⚙️</span>
            <span className="big-card-label">Quản Trị Tài Khoản</span>
          </button>
        </div>
      </div>
    );
  }

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
        <h1 className="app-title">{session.babyName} Bé Yêu</h1>
        <p className="app-subtitle">Ghi nhật ký mỗi ngày của bé</p>
      </div>

      <div className="home-actions">
        <div className="home-actions-group">
          <button className="big-card-button" onClick={() => onNavigate("NOTE")}>
            <span className="big-card-icon">📝</span>
            <span className="big-card-label">Note Thông Tin</span>
          </button>
          <button className="big-card-button" onClick={() => onNavigate("STATS")}>
            <span className="big-card-icon">📊</span>
            <span className="big-card-label">Xem Thống Kê</span>
          </button>
        </div>
        <div className="home-actions-row">
          <div className="vaccine-button-slot">
            {hasOverdueVaccine && (
              <div className="vaccine-home-warning">⚠️ Có mũi tiêm đến hạn hoặc quá hạn!</div>
            )}
            <button className="big-card-button" onClick={() => onNavigate("VACCINE")}>
              <span className="big-card-icon">💉</span>
              <span className="big-card-label">Sổ Tiêm Chủng Online</span>
            </button>
          </div>
          <button className="big-card-button" onClick={() => onNavigate("DIARY")}>
            <span className="big-card-icon">📔</span>
            <span className="big-card-label">Nhật Ký Của Mẹ</span>
          </button>
        </div>
      </div>

      {showChangePin && (
        <ChangePinModal
          session={session}
          onClose={() => setShowChangePin(false)}
          onSessionUpdate={onSessionUpdate}
        />
      )}
    </div>
  );
}
