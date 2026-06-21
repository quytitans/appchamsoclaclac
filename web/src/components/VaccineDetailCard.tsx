import { useEffect, useState } from "react";
import VaccineFieldsEditor, { type VaccineFieldsState } from "./VaccineFieldsEditor";
import DoseHistorySection from "./DoseHistorySection";
import { deleteVaccine, fetchVaccineDetail, updateVaccine } from "../api";
import { todayDateStr } from "../dateUtils";
import type { VaccineDetail } from "../types";

interface Props {
  account: string;
  vaccineId: number;
  onChanged: () => void;
  refreshSignal?: number;
}

function toFields(v: VaccineDetail): VaccineFieldsState {
  return {
    diseaseName: v.disease_name,
    vaccineName: v.vaccine_name,
    totalDoses: v.total_doses != null ? String(v.total_doses) : "",
    durationType: v.duration_type,
    expiryMonth: v.expiry_month != null ? String(v.expiry_month) : "",
    expiryYear: v.expiry_year != null ? String(v.expiry_year) : "",
    nextDoseDate: v.next_dose_date ?? "",
  };
}

export default function VaccineDetailCard({ account, vaccineId, onChanged, refreshSignal }: Props) {
  const [detail, setDetail] = useState<VaccineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<VaccineFieldsState | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    return fetchVaccineDetail(vaccineId, account)
      .then((v) => {
        setDetail(v);
        setFields(toFields(v));
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaccineId, account, refreshSignal]);

  async function handleSave() {
    if (!fields) return;
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
      await updateVaccine(vaccineId, {
        account,
        diseaseName: fields.diseaseName.trim(),
        vaccineName: fields.vaccineName.trim(),
        totalDoses: fields.totalDoses ? Number(fields.totalDoses) : undefined,
        durationType: fields.durationType,
        expiryMonth: fields.durationType === "limited" ? Number(fields.expiryMonth) : undefined,
        expiryYear: fields.durationType === "limited" ? Number(fields.expiryYear) : undefined,
        nextDoseDate: fields.nextDoseDate || undefined,
      });
      setEditing(false);
      await load();
      onChanged();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Đã có lỗi xảy ra" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteVaccine(vaccineId, account);
      setShowDeleteConfirm(false);
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  if (loading || !detail || !fields) return <p className="loading-text">Đang tải...</p>;

  const today = todayDateStr();
  const nearestPlannedDose = detail.doses
    .filter((d) => d.date > today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const nextDoseDate = nearestPlannedDose?.date ?? detail.next_dose_date;
  const isOverdue = nextDoseDate != null && nextDoseDate <= today;

  return (
    <div className="vaccine-detail-card">
      {!editing ? (
        <div className="vaccine-summary">
          <div className="kpi-line">
            <span className="kpi-line-icon">🦠</span>
            Bệnh phòng ngừa: <span className="kpi-value">{detail.disease_name}</span>
          </div>
          <div className="kpi-line">
            <span className="kpi-line-icon">💊</span>
            Vắc-xin: <span className="kpi-value">{detail.vaccine_name}</span>
          </div>
          {detail.total_doses != null && (
            <div className="kpi-line">
              <span className="kpi-line-icon">💉</span>
              Tổng số mũi: <span className="kpi-value">{detail.total_doses}</span>
            </div>
          )}
          <div className="kpi-line">
            <span className="kpi-line-icon">⏳</span>
            Thời hạn:{" "}
            <span className="kpi-value">
              {detail.duration_type === "lifetime"
                ? "Cả đời"
                : detail.duration_type === "yearly"
                ? "Tiêm lại hàng năm"
                : `Đến ${detail.expiry_month}/${detail.expiry_year}`}
            </span>
          </div>
          <div className="kpi-line">
            <span className="kpi-line-icon">{isOverdue ? "⚠️" : "📅"}</span>
            Mũi tiếp theo dự kiến:{" "}
            <span className={`kpi-value ${isOverdue ? "vaccine-overdue-text" : ""}`}>
              {nextDoseDate ?? "Chưa đặt lịch"}
            </span>
          </div>
          <div className="vaccine-summary-actions">
            <button className="nav-switch-button vaccine-edit-button" onClick={() => setEditing(true)}>
              ✏️ Sửa
            </button>
            <button
              className="secondary-button vaccine-delete-button"
              onClick={() => setShowDeleteConfirm(true)}
            >
              🗑️ Xóa
            </button>
          </div>
        </div>
      ) : (
        <>
          <VaccineFieldsEditor state={fields} onChange={setFields} showNextDoseDate />
          <div className="modal-actions">
            <button
              className="secondary-button"
              onClick={() => {
                setEditing(false);
                setFields(toFields(detail));
                setMessage(null);
              }}
            >
              Hủy
            </button>
            <button className="save-button" onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </>
      )}

      {message && <div className={`message ${message.kind}`}>{message.text}</div>}

      <DoseHistorySection account={account} vaccineId={vaccineId} onChanged={onChanged} refreshSignal={refreshSignal} />

      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Xóa vắc-xin?</h3>
            </div>
            <p className="pin-step-label">
              Toàn bộ thông tin và lịch sử các mũi tiêm của "{detail.vaccine_name}" sẽ bị xóa vĩnh viễn.
            </p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setShowDeleteConfirm(false)}>
                Hủy
              </button>
              <button className="save-button vaccine-delete-confirm" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Đang xóa..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
