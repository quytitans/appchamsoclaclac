import { useCallback, useEffect, useState } from "react";
import AppHeader from "../components/AppHeader";
import GrowthFields from "../components/GrowthFields";
import GrowthStatsTable from "../components/GrowthStatsTable";
import GrowthChart from "../components/GrowthChart";
import GrowthEditModal from "../components/GrowthEditModal";
import { createGrowthRecord, fetchGrowthRecords } from "../api";
import { todayDateStr } from "../dateUtils";
import { buildGrowthPayload, emptyGrowthFormState } from "../growthForm";
import type { GrowthRecord, Session } from "../types";
import type { Screen } from "../App";

interface Props {
  session: Session;
  onNavigate: (screen: Screen) => void;
}

export default function GrowthScreen({ session, onNavigate }: Props) {
  const [view, setView] = useState<"entry" | "stats">("entry");
  const [records, setRecords] = useState<GrowthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(() => emptyGrowthFormState(todayDateStr()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GrowthRecord | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    return fetchGrowthRecords(session.account)
      .then(setRecords)
      .finally(() => setLoading(false));
  }, [session.account]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const payload = buildGrowthPayload(form, session.account);
    if (!payload) {
      setError("Vui lòng nhập ngày và ít nhất chiều cao hoặc cân nặng");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createGrowthRecord(payload);
      setShowSuccess(true);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  function handleContinueEntering() {
    setForm(emptyGrowthFormState(todayDateStr()));
    setShowSuccess(false);
  }

  function handleGoToStats() {
    setForm(emptyGrowthFormState(todayDateStr()));
    setShowSuccess(false);
    setView("stats");
  }

  return (
    <div className="screen growth-screen">
      <AppHeader onGoHome={() => onNavigate("HOME")} />
      <header className="screen-header">
        <button className="back-button" onClick={() => onNavigate("HOME")}>
          ←
        </button>
        <h2>Chiều Cao Cân Nặng</h2>
      </header>

      <div className="stats-tabs">
        <button className={`stats-tab ${view === "entry" ? "active" : ""}`} onClick={() => setView("entry")}>
          Nhập Thông Tin
        </button>
        <button className={`stats-tab ${view === "stats" ? "active" : ""}`} onClick={() => setView("stats")}>
          Thống Kê
        </button>
      </div>

      {view === "entry" && (
        <div className="entry-form-card growth-entry-card">
          <div className="entry-form-header">
            <span className="entry-form-header-icon growth-entry-icon">📏</span>
            <div>
              <div className="entry-form-header-title">Ghi Nhận Số Đo</div>
              <div className="entry-form-header-subtitle">Theo dõi chiều cao & cân nặng của bé</div>
            </div>
          </div>

          <div className="note-form">
            <GrowthFields state={form} onChange={handleChange} />
          </div>

          {error && <div className="message error">{error}</div>}

          <button className="save-button" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      )}

      {view === "stats" && (
        <>
          {loading && <p className="loading-text">Đang tải...</p>}
          {!loading && (
            <>
              <GrowthStatsTable records={records} onSelectRecord={setEditingRecord} />
              <GrowthChart records={records} />
            </>
          )}
        </>
      )}

      {editingRecord && (
        <GrowthEditModal
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

      {showSuccess && (
        <div className="modal-overlay">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎉 Đã lưu thành công!</h3>
            </div>
            <p className="pin-step-label">Bạn muốn làm gì tiếp theo?</p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={handleContinueEntering}>
                📝 Nhập tiếp
              </button>
              <button className="save-button" onClick={handleGoToStats}>
                📊 Xem thống kê
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
