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

export default function VaccineFieldsEditor({ state, onChange, showNextDoseDate = false }: Props) {
  return (
    <div className="note-form">
      <div className="field">
        <label className="field-label">Tên thương mại vắc-xin</label>
        <input
          type="text"
          placeholder="VD: Engerix B"
          value={state.vaccineName}
          onChange={(e) => onChange({ ...state, vaccineName: e.target.value })}
        />
      </div>
      <div className="field">
        <label className="field-label">Tên bệnh/Loại bệnh phòng ngừa</label>
        <input
          type="text"
          placeholder="VD: Viêm gan B"
          value={state.diseaseName}
          onChange={(e) => onChange({ ...state, diseaseName: e.target.value })}
        />
      </div>
      <div className="field">
        <label className="field-label">Tổng số mũi cần tiêm</label>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="VD: 3"
          value={state.totalDoses}
          onChange={(e) => onChange({ ...state, totalDoses: e.target.value.replace(/\D/g, "") })}
        />
      </div>
      <div className="field">
        <label className="field-label">Thời hạn bảo vệ</label>
        <div className="toggle-group">
          <button
            type="button"
            className={`toggle-option ${state.durationType === "lifetime" ? "active" : ""}`}
            onClick={() => onChange({ ...state, durationType: "lifetime" })}
          >
            Cả đời
          </button>
          <button
            type="button"
            className={`toggle-option ${state.durationType === "limited" ? "active" : ""}`}
            onClick={() => onChange({ ...state, durationType: "limited" })}
          >
            Có thời hạn
          </button>
          <button
            type="button"
            className={`toggle-option ${state.durationType === "yearly" ? "active" : ""}`}
            onClick={() => onChange({ ...state, durationType: "yearly" })}
          >
            Tiêm lại hàng năm
          </button>
        </div>
      </div>
      {state.durationType === "limited" && (
        <div className="field">
          <label className="field-label">Số năm bảo vệ (tính từ mũi 1)</label>
          <input
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="VD: 5"
            value={state.durationYears}
            onChange={(e) => onChange({ ...state, durationYears: e.target.value.replace(/\D/g, "").slice(0, 2) })}
          />
        </div>
      )}
      {showNextDoseDate && (
        <div className="field">
          <label className="field-label">Ngày tiêm dự kiến tiếp theo (không bắt buộc)</label>
          <input
            type="date"
            value={state.nextDoseDate}
            onChange={(e) => onChange({ ...state, nextDoseDate: e.target.value })}
          />
        </div>
      )}
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
  );
}
