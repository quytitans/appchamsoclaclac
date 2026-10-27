import { useEffect, useState } from "react";
import type { Screen } from "../App";
import type { FeatureKey, Session } from "../types";
import ChangePinModal from "../components/ChangePinModal";
import { fetchFeatures, fetchUpcomingDoses } from "../api";

interface Props {
  session: Session;
  onNavigate: (screen: Screen) => void;
  onLogout: () => void;
  onSessionUpdate: (session: Session) => void;
}

export default function HomeScreen({ session, onNavigate, onLogout, onSessionUpdate }: Props) {
  const [showChangePin, setShowChangePin] = useState(false);
  const [hasOverdueVaccine, setHasOverdueVaccine] = useState(false);
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchFeatures()
      .then((flags) => {
        setFeatures(Object.fromEntries(flags.map((f) => [f.key, f.enabled])));
      })
      .catch(() => {});
  }, []);

  // Cờ chưa tải xong (chưa có key) coi như bật, tránh nháy ẩn nút khi mới vào trang.
  function isEnabled(key: FeatureKey): boolean {
    return features[key] ?? true;
  }

  useEffect(() => {
    if (session.isAdmin) return;

    function checkOverdue() {
      fetchUpcomingDoses(session.account)
        .then((doses) => {
          setHasOverdueVaccine(doses.some((d) => d.overdue));
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

  const showNoteStats = isEnabled("NOTE_STATS");
  const showVaccine = isEnabled("VACCINE");
  const showDiary = isEnabled("DIARY");
  const showGrowth = isEnabled("GROWTH");

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
        <div className="home-emoji">📔</div>
        <h1 className="app-title">Trộm Vía Trộm Vía</h1>
        <p className="app-subtitle">Ghi nhật ký mỗi ngày của bé</p>
      </div>

      <div className="home-actions">
        {showNoteStats && (
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
        )}
        {(showVaccine || showDiary) && (
          <div className="home-actions-row">
            {showVaccine && (
              <button
                className={`big-card-button ${hasOverdueVaccine ? "big-card-button-overdue" : ""}`}
                onClick={() => onNavigate("VACCINE")}
              >
                {hasOverdueVaccine && <span className="overdue-ribbon">Quá hạn</span>}
                <span className="big-card-icon">💉</span>
                <span className="big-card-label">Sổ Tiêm Chủng Online</span>
              </button>
            )}
            {showDiary && (
              <button className="big-card-button" onClick={() => onNavigate("DIARY")}>
                <span className="big-card-icon">📔</span>
                <span className="big-card-label">Nhật Ký Của Mẹ</span>
              </button>
            )}
          </div>
        )}
        {showGrowth && (
          <div className="home-actions-row">
            <button className="big-card-button" onClick={() => onNavigate("GROWTH")}>
              <span className="big-card-icon">📏</span>
              <span className="big-card-label">Chiều Cao Cân Nặng</span>
            </button>
          </div>
        )}
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
