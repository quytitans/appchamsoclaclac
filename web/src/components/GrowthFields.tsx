import type { ChangeEvent } from "react";
import type { GrowthFormState } from "../growthForm";

interface Props {
  state: GrowthFormState;
  onChange: <K extends keyof GrowthFormState>(key: K, value: GrowthFormState[K]) => void;
}

function onNonNegativeChange(key: "heightCm" | "weightKg", onChange: Props["onChange"]) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value !== "" && Number(value) < 0) return;
    onChange(key, value);
  };
}

export default function GrowthFields({ state, onChange }: Props) {
  return (
    <>
      <div className="field">
        <label className="field-label">Ngày nhập</label>
        <input type="date" value={state.date} onChange={(e) => onChange("date", e.target.value)} />
      </div>

      <div className="field">
        <label className="field-label">Mốc đo</label>
        <input
          type="text"
          placeholder="VD: Tháng 1"
          value={state.milestoneLabel}
          onChange={(e) => onChange("milestoneLabel", e.target.value)}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field-label">Chiều cao</label>
          <div className="input-icon-wrap">
            <span className="input-icon">📏</span>
            <input
              className="input-with-icon"
              type="number"
              min={0}
              step="0.1"
              inputMode="decimal"
              placeholder="cm"
              value={state.heightCm}
              onChange={onNonNegativeChange("heightCm", onChange)}
            />
          </div>
        </div>
        <div className="field">
          <label className="field-label">Cân nặng</label>
          <div className="input-icon-wrap">
            <span className="input-icon">⚖️</span>
            <input
              className="input-with-icon"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="kg"
              value={state.weightKg}
              onChange={onNonNegativeChange("weightKg", onChange)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
