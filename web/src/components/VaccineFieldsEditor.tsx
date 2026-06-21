import type { VaccineDurationType } from "../types";

export interface VaccineFieldsState {
  diseaseName: string;
  vaccineName: string;
  totalDoses: string;
  durationType: VaccineDurationType;
  expiryMonth: string;
  expiryYear: string;
  nextDoseDate: string;
}

export function emptyVaccineFields(): VaccineFieldsState {
  return {
    diseaseName: "",
    vaccineName: "",
    totalDoses: "",
    durationType: "lifetime",
    expiryMonth: "",
    expiryYear: "",
    nextDoseDate: "",
  };
}

interface Props {
  state: VaccineFieldsState;
  onChange: (state: VaccineFieldsState) => void;
  showNextDoseDate?: boolean;
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

function buildYearOptions(currentValue: string): number[] {
  const thisYear = new Date().getFullYear();
  const years = new Set<number>();
  for (let y = thisYear - 1; y <= thisYear + 30; y++) years.add(y);
  if (currentValue) years.add(Number(currentValue));
  return Array.from(years).sort((a, b) => a - b);
}

export default function VaccineFieldsEditor({ state, onChange, showNextDoseDate = false }: Props) {
  const yearOptions = buildYearOptions(state.expiryYear);
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
        </div>
      </div>
      {state.durationType === "limited" && (
        <div className="field-row">
          <div className="field">
            <label className="field-label">Tháng hết hạn</label>
            <select
              value={state.expiryMonth ? String(Number(state.expiryMonth)) : ""}
              onChange={(e) => onChange({ ...state, expiryMonth: e.target.value })}
            >
              <option value="">Chọn tháng</option>
              {MONTH_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  Tháng {m}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label">Năm hết hạn</label>
            <select
              value={state.expiryYear}
              onChange={(e) => onChange({ ...state, expiryYear: e.target.value })}
            >
              <option value="">Chọn năm</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  Năm {y}
                </option>
              ))}
            </select>
          </div>
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
    </div>
  );
}
