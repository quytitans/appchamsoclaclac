import { useState } from "react";
import { addVaccineDose } from "../api";
import { todayDateStr } from "../dateUtils";

interface Props {
  account: string;
  vaccineId: number;
  vaccineName: string;
  nextDoseNumber: number;
  onClose: () => void;
  onCreated?: () => void;
}

export default function NextDoseModal({
  account,
  vaccineId,
  vaccineName,
  nextDoseNumber,
  onClose,
  onCreated,
}: Props) {
  const [date, setDate] = useState(todayDateStr());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!date) {
      setError("Vui lòng chọn ngày dự kiến");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await addVaccineDose(vaccineId, {
        account,
        doseNumber: nextDoseNumber,
        date,
        planned: true,
      });
      onCreated?.();
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
          <h3>📅 Đặt lịch mũi tiếp theo?</h3>
        </div>
        <p className="pin-step-label">
          Đã hoàn thành mũi trước của "{vaccineName}". Bạn có muốn đặt lịch dự kiến cho mũi {nextDoseNumber} không?
        </p>
        <div className="field">
          <label className="field-label">Ngày dự kiến</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        {error && <div className="message error">{error}</div>}
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose} disabled={saving}>
            Bỏ qua
          </button>
          <button className="save-button" onClick={handleCreate} disabled={saving}>
            {saving ? "Đang lưu..." : `Tạo lịch mũi ${nextDoseNumber}`}
          </button>
        </div>
      </div>
    </div>
  );
}
