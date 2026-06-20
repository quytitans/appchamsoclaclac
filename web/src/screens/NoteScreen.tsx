import { useState } from "react";
import AppHeader from "../components/AppHeader";
import RecordFields from "../components/RecordFields";
import { createRecord } from "../api";
import { ACTIVITY_META, NOTE_TYPE_ORDER } from "../constants";
import { nowTimeStr, todayDateStr } from "../dateUtils";
import { buildRecordPayload, emptyRecordFormState } from "../recordForm";
import type { RecordType } from "../types";
import type { Screen } from "../App";

interface Props {
  onNavigate: (screen: Screen) => void;
}

export default function NoteScreen({ onNavigate }: Props) {
  const [type, setType] = useState<RecordType>("hut_sua");
  const [form, setForm] = useState(() => emptyRecordFormState(todayDateStr(), nowTimeStr()));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  function handleChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleTypeChange(newType: RecordType) {
    setType(newType);
    setError(null);
    setForm(emptyRecordFormState(todayDateStr(), nowTimeStr()));
  }

  async function handleSave() {
    const payload = buildRecordPayload(type, form);
    if (!payload) {
      setError("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createRecord(payload);
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  function handleContinueEntering() {
    setForm(emptyRecordFormState(todayDateStr(), nowTimeStr()));
    setShowSuccess(false);
  }

  function handleGoToStats() {
    setShowSuccess(false);
    onNavigate("STATS");
  }

  return (
    <div className="screen note-screen">
      <AppHeader onGoHome={() => onNavigate("HOME")} />
      <header className="screen-header">
        <button className="back-button" onClick={() => onNavigate("HOME")}>
          ←
        </button>
        <h2>Note Thông Tin</h2>
        <button className="nav-switch-button" onClick={() => onNavigate("STATS")}>
          📊 Thống Kê
        </button>
      </header>

      <div className="type-grid">
        {NOTE_TYPE_ORDER.map((t) => (
          <button
            key={t}
            className={`type-chip ${type === t ? "active" : ""}`}
            onClick={() => handleTypeChange(t)}
          >
            <span className="type-chip-icon">{ACTIVITY_META[t].icon}</span>
            <span>{ACTIVITY_META[t].label}</span>
          </button>
        ))}
      </div>

      <div className="note-form">
        <RecordFields type={type} state={form} onChange={handleChange} />
      </div>

      {error && <div className="message error">{error}</div>}

      <button className="save-button" onClick={handleSave} disabled={saving}>
        {saving ? "Đang lưu..." : "Lưu"}
      </button>

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
