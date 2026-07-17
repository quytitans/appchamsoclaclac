import { useEffect, useState } from "react";
import VaccineFieldsEditor, { type VaccineFieldsState } from "./VaccineFieldsEditor";
import DoseHistorySection from "./DoseHistorySection";
import { deleteVaccine, fetchVaccineDetail, updateVaccine } from "../api";
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
    durationYears: v.duration_years != null ? String(v.duration_years) : "",
    nextDoseDate: v.next_dose_date ?? "",
    note: v.note ?? "",
  };
}

function formatDuration(v: VaccineDetail): string {
  if (v.duration_type === "lifetime") return "Cả đời";
  if (v.duration_type === "yearly") return "Tiêm lại hàng năm";
  const hasExpiry = v.expiry_month != null && v.expiry_year != null;
  if (v.duration_years != null) {
    return hasExpiry
      ? `${v.duration_years} năm (Đến ${v.expiry_month}/${v.expiry_year})`
      : `${v.duration_years} năm (chưa xác định ngày hết hạn — cần nhập mũi 1)`;
  }
  return hasExpiry ? `Đến ${v.expiry_month}/${v.expiry_year}` : "Chưa xác định";
}

export default function VaccineDetailCard({ account, vaccineId, onChanged, refreshSignal }: Props) {
  const [detail, setDetail] = useState<VaccineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGeneralInfo, setShowGeneralInfo] = useState(false);
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
    if (fields.durationType === "limited" && !fields.durationYears) {
      setMessage({ kind: "error", text: "Vui lòng nhập số năm bảo vệ" });
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
        durationYears: fields.durationType === "limited" ? Number(fields.durationYears) : undefined,
        nextDoseDate: fields.nextDoseDate || undefined,
        note: fields.note.trim() || undefined,
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

  const nextDoseDate = detail.nextDue?.date ?? null;
  const isOverdue = detail.nextDue?.overdue ?? false;
  const doseCount = detail.doses.filter((d) => !d.planned).length;

  return (
    <div className="vaccine-detail-card">
      <button className="nav-switch-button vaccine-info-toggle" onClick={() => setShowGeneralInfo((s) => !s)}>
        ℹ️ Thông tin vắc-xin {showGeneralInfo ? "▲" : "▼"}
      </button>

      {showGeneralInfo &&
        (!editing ? (
          <div className="vaccine-summary">
            <div className="kpi-line">
              <span className="kpi-line-icon">🦠</span>
              Bệnh phòng ngừa: <span className="kpi-value">{detail.disease_name}</span>
            </div>
            <div className="kpi-line">
              <span className="kpi-line-icon">💊</span>
              Vắc-xin: <span className="kpi-value">{detail.vaccine_name}</span>
            </div>
            <div className="kpi-line">
              <span className="kpi-line-icon">💉</span>
              Đã tiêm:{" "}
              <span className="kpi-value">
                {detail.total_doses != null ? `${doseCount}/${detail.total_doses} mũi` : `${doseCount} mũi`}
              </span>
            </div>
            <div className="kpi-line">
              <span className="kpi-line-icon">⏳</span>
              Thời hạn: <span className="kpi-value">{formatDuration(detail)}</span>
            </div>
            <div className="kpi-line">
              <span className="kpi-line-icon">{isOverdue ? "⚠️" : "📅"}</span>
              Mũi tiếp theo dự kiến:{" "}
              <span className={`kpi-value ${isOverdue ? "vaccine-overdue-text" : ""}`}>
                {nextDoseDate ?? "Chưa đặt lịch"}
              </span>
            </div>
            {detail.note && (
              <div className="kpi-line">
                <span className="kpi-line-icon">📝</span>
                Ghi chú: <span className="kpi-value vaccine-note-value">{detail.note}</span>
              </div>
            )}
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
        ))}

      {message && <div className={`message ${message.kind}`}>{message.text}</div>}

      <DoseHistorySection
        account={account}
        vaccineId={vaccineId}
        onChanged={() => {
          load();
          onChanged();
        }}
        refreshSignal={refreshSignal}
      />

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
