import { formatDateTimeVN } from "../dateUtils";
import { computeExpiryPreview } from "../thawedMilkForm";
import type { ThawedMilkFormState } from "../thawedMilkForm";

interface Props {
  state: ThawedMilkFormState;
  onChange: <K extends keyof ThawedMilkFormState>(key: K, value: ThawedMilkFormState[K]) => void;
}

export default function ThawedMilkFields({ state, onChange }: Props) {
  const expiryPreview = computeExpiryPreview(state);

  return (
    <>
      <div className="field">
        <label className="field-label">
          Ngày lưu trữ <span className="field-label-hint">(có thể nhập hoặc bỏ trống)</span>
        </label>
        <input
          className="input-with-icon"
          type="date"
          value={state.storageDate}
          onChange={(e) => onChange("storageDate", e.target.value)}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label className="field-label">Ngày lấy ra</label>
          <input
            type="date"
            value={state.takenOutDate}
            onChange={(e) => onChange("takenOutDate", e.target.value)}
          />
        </div>
        <div className="field">
          <label className="field-label">Giờ lấy ra</label>
          <input
            type="time"
            value={state.takenOutTime}
            onChange={(e) => onChange("takenOutTime", e.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label className="field-label">Hạn sử dụng (giờ)</label>
        <input
          className="input-with-icon"
          type="number"
          min={1}
          step="1"
          inputMode="numeric"
          value={state.expiryHours}
          onChange={(e) => onChange("expiryHours", e.target.value)}
        />
      </div>

      {expiryPreview && (
        <div className="thawed-milk-expiry-preview">
          ⏰ Hết hạn lúc: <strong>{formatDateTimeVN(expiryPreview)}</strong>
        </div>
      )}
    </>
  );
}
