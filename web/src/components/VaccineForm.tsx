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

  async function handleSave() {
    if (!fields.diseaseName.trim() || !fields.vaccineName.trim()) {
      setMessage({ kind: "error", text: "Vui lòng nhập tên bệnh và tên vắc-xin" });
      return;
    }
    if (fields.durationType === "limited" && (!fields.expiryMonth || !fields.expiryYear)) {
      setMessage({ kind: "error", text: "Vui lòng nhập tháng/năm hết hạn tác dụng" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const created = await createVaccine({
        account,
        diseaseName: fields.diseaseName.trim(),
        vaccineName: fields.vaccineName.trim(),
        totalDoses: fields.totalDoses ? Number(fields.totalDoses) : undefined,
        durationType: fields.durationType,
        expiryMonth: fields.durationType === "limited" ? Number(fields.expiryMonth) : undefined,
        expiryYear: fields.durationType === "limited" ? Number(fields.expiryYear) : undefined,
      });
      setCurrentId(created.id);
      onCreated?.(created.id);
      setShowConfirm(true);
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Đã có lỗi xảy ra" });
    } finally {
      setSaving(false);
    }
  }

  function handleConfirm() {
    setShowConfirm(false);
    onConfirmedSaved?.();
  }

  function handleCancel() {
    setShowConfirm(false);
    setMessage(null);
    setFields(emptyVaccineFields());
    setCurrentId(null);
  }

  return (
    <div className="vaccine-form">
      <VaccineFieldsEditor state={fields} onChange={setFields} />

      {message && <div className={`message ${message.kind}`}>{message.text}</div>}

      <button className="save-button" onClick={handleSave} disabled={saving}>
        {saving ? "Đang lưu..." : "Lưu thông tin vắc-xin"}
      </button>

      {currentId != null && <DoseHistorySection account={account} vaccineId={currentId} />}

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎉 Đã lưu thành công!</h3>
            </div>
            <p className="pin-step-label">Thông tin vắc-xin đã được lưu vào sổ tiêm chủng. Chuyển sang xem sổ tiêm chủng?</p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={handleCancel}>
                Hủy
              </button>
              <button className="save-button" onClick={handleConfirm}>
                Đồng Ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
