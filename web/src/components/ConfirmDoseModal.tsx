import { useState } from "react";
import { confirmVaccineDose } from "../api";
import { todayDateStr } from "../dateUtils";

interface Props {
  account: string;
  vaccineId: number;
  vaccineName: string;
  doseNumber: number;
  plannedDate: string;
  plannedLocation?: string | null;
  plannedNote?: string | null;
  onClose: () => void;
  onConfirmed: (doseCount: number) => void;
}

export default function ConfirmDoseModal({
  account,
  vaccineId,
  vaccineName,
  doseNumber,
  plannedDate,
  plannedLocation,
  plannedNote,
  onClose,
  onConfirmed,
}: Props) {
  const [date, setDate] = useState(plannedDate || todayDateStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!date) {
      setError("Vui lòng chọn ngày tiêm");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await confirmVaccineDose(vaccineId, account, date);
      onConfirmed(updated.doseCount);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✅ Xác nhận đã tiêm?</h3>
        </div>
        <p className="pin-step-label">
          Xác nhận mũi {doseNumber} của "{vaccineName}" đã được tiêm?
        </p>
        {(plannedLocation || plannedNote) && (
          <div className="confirm-dose-planned-info">
            <div className="confirm-dose-planned-title">📌 Lịch dự kiến đã nhập trước:</div>
            {plannedLocation && (
              <div className="kpi-line">
                📍 Nơi tiêm: <span className="kpi-value">{plannedLocation}</span>
              </div>
            )}
            {plannedNote && (
              <div className="kpi-line">
                📝 Ghi chú: <span className="kpi-value">{plannedNote}</span>
              </div>
            )}
          </div>
        )}
        <div className="field">
          <label className="field-label">Ngày tiêm thực tế</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {error && <div className="message error">{error}</div>}
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose} disabled={saving}>
            Hủy
          </button>
          <button className="save-button" onClick={handleConfirm} disabled={saving}>
            {saving ? "Đang lưu..." : "Xác nhận đã tiêm"}
          </button>
        </div>
      </div>
    </div>
  );
}
