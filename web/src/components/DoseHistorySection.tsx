import { useCallback, useEffect, useState } from "react";
import { addVaccineDose, deleteVaccineDose, fetchVaccineDetail, updateVaccineDose } from "../api";
import { todayDateStr } from "../dateUtils";
import type { VaccineDose } from "../types";

interface Props {
  account: string;
  vaccineId: number;
  onChanged?: () => void;
  refreshSignal?: number;
}

interface DoseFormState {
  doseNumber: string;
  location: string;
  date: string;
  note: string;
}

function emptyDoseForm(nextNumber: number): DoseFormState {
  return { doseNumber: String(nextNumber), location: "", date: todayDateStr(), note: "" };
}

export default function DoseHistorySection({ account, vaccineId, onChanged, refreshSignal }: Props) {
  const [doses, setDoses] = useState<VaccineDose[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const [doseEditorOpen, setDoseEditorOpen] = useState(false);
  const [editingDoseId, setEditingDoseId] = useState<number | null>(null);
  const [doseForm, setDoseForm] = useState<DoseFormState>(emptyDoseForm(1));
  const [savingDose, setSavingDose] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    return fetchVaccineDetail(vaccineId, account)
      .then((v) => setDoses(v.doses))
      .finally(() => setLoading(false));
  }, [vaccineId, account]);

  useEffect(() => {
    load();
  }, [load, refreshSignal]);

  function openAddDose() {
    const nextNumber = doses.length > 0 ? doses[doses.length - 1].dose_number + 1 : 1;
    setEditingDoseId(null);
    setDoseForm(emptyDoseForm(nextNumber));
    setDoseEditorOpen(true);
  }

  function openEditDose(dose: VaccineDose) {
    setEditingDoseId(dose.id);
    setDoseForm({
      doseNumber: String(dose.dose_number),
      location: dose.location ?? "",
      date: dose.date,
      note: dose.note ?? "",
    });
    setDoseEditorOpen(true);
  }

  async function handleSaveDose() {
    if (!doseForm.doseNumber || !doseForm.date) {
      setMessage("Vui lòng nhập đủ mũi số mấy và ngày tiêm");
      return;
    }
    setSavingDose(true);
    setMessage(null);
    const payload = {
      account,
      doseNumber: Number(doseForm.doseNumber),
      location: doseForm.location || undefined,
      date: doseForm.date,
      note: doseForm.note || undefined,
    };
    try {
      if (editingDoseId == null) {
        const created = await addVaccineDose(vaccineId, payload);
        setDoses((prev) => [...prev, created].sort((a, b) => a.dose_number - b.dose_number));
      } else {
        const updated = await updateVaccineDose(vaccineId, editingDoseId, payload);
        setDoses((prev) =>
          prev.map((d) => (d.id === editingDoseId ? updated : d)).sort((a, b) => a.dose_number - b.dose_number)
        );
      }
      setDoseEditorOpen(false);
      onChanged?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSavingDose(false);
    }
  }

  async function handleDeleteDose(doseId: number) {
    if (!window.confirm("Xóa mũi tiêm này? Hành động không thể hoàn tác.")) return;
    try {
      await deleteVaccineDose(vaccineId, doseId, account);
      setDoses((prev) => prev.filter((d) => d.id !== doseId));
      onChanged?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    }
  }

  if (loading) return <p className="loading-text">Đang tải...</p>;

  return (
    <section className="month-section vaccine-doses-section">
      <h3 className="month-section-title">💉 Lịch sử các mũi đã tiêm</h3>

      {message && <div className="message error">{message}</div>}
      {doses.length === 0 && <p className="loading-text">Chưa có mũi tiêm nào</p>}

      {doses.map((dose) => {
        const isUpcoming = dose.date > todayDateStr();
        return doseEditorOpen && editingDoseId === dose.id ? (
          <DoseEditor
            key={dose.id}
            form={doseForm}
            onChange={setDoseForm}
            onSave={handleSaveDose}
            onCancel={() => setDoseEditorOpen(false)}
            saving={savingDose}
          />
        ) : (
          <div key={dose.id} className={`dose-card ${isUpcoming ? "dose-upcoming" : ""}`}>
            <div className="dose-card-header">
              <span className="dose-number-badge">Mũi {dose.dose_number}</span>
              {isUpcoming && <span className="dose-upcoming-badge">📌 Dự kiến</span>}
              <span className="dose-date">{dose.date}</span>
              <div className="dose-icon-actions">
                <button
                  className="dose-icon-button"
                  onClick={() => openEditDose(dose)}
                  aria-label="Sửa mũi tiêm"
                  title="Sửa"
                >
                  ✏️
                </button>
                <button
                  className="dose-icon-button dose-icon-delete"
                  onClick={() => handleDeleteDose(dose.id)}
                  aria-label="Xóa mũi tiêm"
                  title="Xóa"
                >
                  🗑️
                </button>
              </div>
            </div>
            {dose.location && <div className="dose-detail">📍 {dose.location}</div>}
            {dose.note && <div className="dose-detail">📝 {dose.note}</div>}
          </div>
        );
      })}

      {doseEditorOpen && editingDoseId == null && (
        <DoseEditor
          form={doseForm}
          onChange={setDoseForm}
          onSave={handleSaveDose}
          onCancel={() => setDoseEditorOpen(false)}
          saving={savingDose}
        />
      )}

      {!doseEditorOpen && (
        <button className="secondary-button add-dose-button" onClick={openAddDose}>
          ➕ Thêm mũi tiêm
        </button>
      )}
    </section>
  );
}

function DoseEditor({
  form,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  form: DoseFormState;
  onChange: (f: DoseFormState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="dose-card dose-editor">
      <div className="field-row">
        <div className="field">
          <label className="field-label">Mũi số</label>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            value={form.doseNumber}
            onChange={(e) => onChange({ ...form, doseNumber: e.target.value.replace(/\D/g, "") })}
          />
        </div>
        <div className="field">
          <label className="field-label">Ngày tiêm</label>
          <input type="date" value={form.date} onChange={(e) => onChange({ ...form, date: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label className="field-label">Nơi tiêm</label>
        <input
          type="text"
          placeholder="VD: Trạm y tế phường"
          value={form.location}
          onChange={(e) => onChange({ ...form, location: e.target.value })}
        />
      </div>
      <div className="field">
        <label className="field-label">Theo dõi sau tiêm</label>
        <textarea
          rows={2}
          placeholder="VD: Sốt nhẹ, quấy khóc 1 ngày"
          value={form.note}
          onChange={(e) => onChange({ ...form, note: e.target.value })}
        />
      </div>
      <div className="modal-actions">
        <button className="secondary-button" onClick={onCancel}>
          Hủy
        </button>
        <button className="save-button" onClick={onSave} disabled={saving}>
          {saving ? "Đang lưu..." : "Lưu mũi tiêm"}
        </button>
      </div>
    </div>
  );
}
