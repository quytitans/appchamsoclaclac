import { useState } from "react";
import VaccineFieldsEditor, { emptyVaccineFields, type VaccineFieldsState } from "./VaccineFieldsEditor";
import DoseHistorySection from "./DoseHistorySection";
import { createVaccine } from "../api";

interface Props {
  account: string;
  onCreated?: (id: number) => void;
  onConfirmedSaved?: () => void;
}

export default function VaccineForm({ account, onCreated, onConfirmedSaved }: Props) {
  const [fields, setFields] = useState<VaccineFieldsState>(emptyVaccineFields());
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleSaveClick() {
    if (!fields.diseaseName.trim() || !fields.vaccineName.trim()) {
      setMessage({ kind: "error", text: "Vui lòng nhập tên bệnh và tên vắc-xin" });
      return;
    }
    if (fields.durationType === "limited" && !fields.durationYears) {
      setMessage({ kind: "error", text: "Vui lòng nhập số năm bảo vệ" });
      return;
    }
    setMessage(null);
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setSaving(true);
    setMessage(null);
    try {
      const created = await createVaccine({
        account,
        diseaseName: fields.diseaseName.trim(),
        vaccineName: fields.vaccineName.trim(),
        totalDoses: fields.totalDoses ? Number(fields.totalDoses) : undefined,
        durationType: fields.durationType,
        durationYears: fields.durationType === "limited" ? Number(fields.durationYears) : undefined,
        note: fields.note.trim() || undefined,
      });
      setCurrentId(created.id);
      onCreated?.(created.id);
      setShowConfirm(false);
      onConfirmedSaved?.();
    } catch (err) {
      setShowConfirm(false);
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Đã có lỗi xảy ra" });
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setShowConfirm(false);
  }

  return (
    <div className="vaccine-form">
      <VaccineFieldsEditor state={fields} onChange={setFields} />

      {message && <div className={`message ${message.kind}`}>{message.text}</div>}

      <button className="save-button" onClick={handleSaveClick} disabled={saving}>
        {saving ? "Đang lưu..." : "Lưu thông tin vắc-xin"}
      </button>

      {currentId != null && <DoseHistorySection account={account} vaccineId={currentId} />}

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Xác nhận lưu vắc-xin?</h3>
            </div>
            <p className="pin-step-label">
              Lưu "{fields.vaccineName.trim()}" vào sổ tiêm chủng và chuyển sang xem sổ tiêm chủng?
            </p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={handleCancel} disabled={saving}>
                Hủy
              </button>
              <button className="save-button" onClick={handleConfirm} disabled={saving}>
                {saving ? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
