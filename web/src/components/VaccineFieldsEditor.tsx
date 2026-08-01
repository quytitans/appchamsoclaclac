import type { VaccineDurationType } from "../types";

export interface VaccineFieldsState {
  diseaseName: string;
  vaccineName: string;
  totalDoses: string;
  durationType: VaccineDurationType;
  durationYears: string;
  nextDoseDate: string;
  note: string;
}

export function emptyVaccineFields(): VaccineFieldsState {
  return {
    diseaseName: "",
    vaccineName: "",
    totalDoses: "",
    durationType: "lifetime",
    durationYears: "",
    nextDoseDate: "",
    note: "",
  };
}

interface Props {
  state: VaccineFieldsState;
  onChange: (state: VaccineFieldsState) => void;
  showNextDoseDate?: boolean;
}

const DURATION_OPTIONS: { value: VaccineDurationType; icon: string; label: string }[] = [
  { value: "lifetime", icon: "♾️", label: "Cả đời" },
  { value: "limited", icon: "⏳", label: "Có thời hạn" },
  { value: "yearly", icon: "🔁", label: "Hàng năm" },
];

export default function VaccineFieldsEditor({ state, onChange, showNextDoseDate = false }: Props) {
  return (
    <div className="note-form">
      <div className="form-section">
        <div className="form-section-title">
          <span className="form-section-icon">📋</span> Thông tin cơ bản
        </div>
        <div className="field">
          <label className="field-label">Tên thương mại vắc-xin</label>
          <div className="input-icon-wrap">
            <span className="input-icon">💊</span>
            <input
              className="input-with-icon"
              type="text"
              placeholder="VD: Engerix B"
              value={state.vaccineName}
              onChange={(e) => onChange({ ...state, vaccineName: e.target.value })}
            />
          </div>
        </div>
        <div className="field">
          <label className="field-label">Tên bệnh/Loại bệnh phòng ngừa</label>
          <div className="input-icon-wrap">
            <span className="input-icon">🦠</span>
            <input
              className="input-with-icon"
              type="text"
              placeholder="VD: Viêm gan B"
              value={state.diseaseName}
              onChange={(e) => onChange({ ...state, diseaseName: e.target.value })}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">
          <span className="form-section-icon">💉</span> Lịch tiêm
        </div>
        <div className="field">
          <label className="field-label">Tổng số mũi cần tiêm</label>
          <div className="input-icon-wrap">
            <span className="input-icon">#️⃣</span>
            <input
              className="input-with-icon"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="VD: 3"
              value={state.totalDoses}
              onChange={(e) => onChange({ ...state, totalDoses: e.target.value.replace(/\D/g, "") })}
            />
          </div>
        </div>
        <div className="field">
          <label className="field-label">Thời hạn bảo vệ</label>
          <div className="option-card-grid">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`option-card ${state.durationType === opt.value ? "active" : ""}`}
                onClick={() => onChange({ ...state, durationType: opt.value })}
              >
                <span className="option-card-icon">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
        {state.durationType === "limited" && (
          <div className="field">
            <label className="field-label">Số năm bảo vệ (tính từ mũi 1)</label>
            <div className="input-icon-wrap">
              <span className="input-icon">📆</span>
              <input
                className="input-with-icon"
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="VD: 5"
                value={state.durationYears}
                onChange={(e) =>
                  onChange({ ...state, durationYears: e.target.value.replace(/\D/g, "").slice(0, 2) })
                }
              />
            </div>
          </div>
        )}
        {showNextDoseDate && (
          <div className="field">
            <label className="field-label">Ngày tiêm dự kiến tiếp theo (không bắt buộc)</label>
            <div className="input-icon-wrap">
              <span className="input-icon">📅</span>
              <input
                className="input-with-icon"
                type="date"
                value={state.nextDoseDate}
                onChange={(e) => onChange({ ...state, nextDoseDate: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      <div className="form-section">
        <div className="form-section-title">
          <span className="form-section-icon">📝</span> Ghi chú
        </div>
        <div className="field">
          <label className="field-label">Ghi chú (không bắt buộc)</label>
          <textarea
            rows={4}
            placeholder="Lưu ý thêm về vắc-xin này..."
            value={state.note}
            onChange={(e) => onChange({ ...state, note: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
