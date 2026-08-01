import type { DiaryImportance } from "../types";

export const IMPORTANCE_OPTIONS: { value: DiaryImportance; icon: string; label: string; accentClass: string }[] = [
  { value: "cao", icon: "🍃", label: "Cao", accentClass: "diary-accent-cao" },
  { value: "rat_cao", icon: "🌸", label: "Rất Cao", accentClass: "diary-accent-rat-cao" },
  { value: "cuc_ky_cao", icon: "💎", label: "Cực Kì Cao", accentClass: "diary-accent-cuc-ky-cao" },
];

interface Props {
  value: DiaryImportance;
  onChange: (value: DiaryImportance) => void;
}

export default function DiaryImportancePicker({ value, onChange }: Props) {
  return (
    <div className="option-card-grid">
      {IMPORTANCE_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`option-card ${opt.accentClass} ${value === opt.value ? "active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          <span className="option-card-icon">{opt.icon}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}
