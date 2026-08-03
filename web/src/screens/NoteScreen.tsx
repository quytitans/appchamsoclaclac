import { useState } from "react";
import type { CSSProperties } from "react";
import AppHeader from "../components/AppHeader";
import RecordFields from "../components/RecordFields";
import ThawedMilkFields from "../components/ThawedMilkFields";
import { createRecord, createThawedMilk } from "../api";
import { getNoteTabMeta, NOTE_TYPE_ORDER } from "../constants";
import { nowTimeStr, todayDateStr } from "../dateUtils";
import { buildRecordPayload, emptyRecordFormState } from "../recordForm";
import { buildThawedMilkPayload, emptyThawedMilkFormState } from "../thawedMilkForm";
import type { NoteTab } from "../constants";
import type { Session } from "../types";
import type { Screen } from "../App";

interface Props {
  session: Session;
  onNavigate: (screen: Screen) => void;
}

export default function NoteScreen({ session, onNavigate }: Props) {
  const [type, setType] = useState<NoteTab>("hut_sua");
  const [form, setForm] = useState(() => emptyRecordFormState(todayDateStr(), nowTimeStr()));
  const [thawedMilkForm, setThawedMilkForm] = useState(() =>
    emptyThawedMilkFormState(todayDateStr(), nowTimeStr())
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  function handleChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleThawedMilkChange<K extends keyof typeof thawedMilkForm>(
    key: K,
    value: (typeof thawedMilkForm)[K]
  ) {
    setThawedMilkForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetThawedMilkForm() {
    setThawedMilkForm(emptyThawedMilkFormState(todayDateStr(), nowTimeStr()));
  }

  function handleTypeChange(newType: NoteTab) {
    setType(newType);
    setError(null);
    setForm(emptyRecordFormState(todayDateStr(), nowTimeStr()));
    resetThawedMilkForm();
  }

  async function handleSave() {
    if (type === "sua_ra_dong") {
      const payload = buildThawedMilkPayload(thawedMilkForm, session.account);
      if (!payload) {
        setError("Vui lòng nhập đầy đủ thông tin bắt buộc");
        return;
      }
      setSaving(true);
      setError(null);
      try {
        await createThawedMilk(payload);
        setShowSuccess(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
      } finally {
        setSaving(false);
      }
      return;
    }

    const payload = buildRecordPayload(type, form);
    if (!payload) {
      setError("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createRecord({ ...payload, account: session.account });
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  function handleContinueEntering() {
    setForm(emptyRecordFormState(todayDateStr(), nowTimeStr()));
    resetThawedMilkForm();
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
            style={{ "--accent": getNoteTabMeta(t).accent } as CSSProperties}
            onClick={() => handleTypeChange(t)}
          >
            <span className="type-chip-icon">{getNoteTabMeta(t).icon}</span>
            <span>{getNoteTabMeta(t).label}</span>
          </button>
        ))}
      </div>

      <div className="entry-form-card">
        <div className="entry-form-header">
          <span className="entry-form-header-icon" style={{ "--accent": getNoteTabMeta(type).accent } as CSSProperties}>
            {getNoteTabMeta(type).icon}
          </span>
          <div>
            <div className="entry-form-header-title">{getNoteTabMeta(type).label}</div>
            <div className="entry-form-header-subtitle">
              {type === "sua_ra_dong" ? "Quản lý sữa rã đông" : "Ghi lại hoạt động của bé"}
            </div>
          </div>
        </div>

        <div className="note-form">
          {type === "sua_ra_dong" ? (
            <ThawedMilkFields state={thawedMilkForm} onChange={handleThawedMilkChange} />
          ) : (
            <RecordFields type={type} state={form} onChange={handleChange} />
          )}
        </div>

        {error && <div className="message error">{error}</div>}

        {type === "sua_ra_dong" ? (
          <div className="modal-actions">
            <button className="secondary-button" onClick={resetThawedMilkForm} disabled={saving}>
              Hủy
            </button>
            <button className="save-button" onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        ) : (
          <button className="save-button" onClick={handleSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        )}
      </div>

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
