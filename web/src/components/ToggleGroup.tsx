interface ToggleOption {
  value: string;
  label: string;
  icon?: string;
}

interface Props {
  options: ToggleOption[];
  value: string | undefined;
  onChange: (value: string) => void;
}

export default function ToggleGroup({ options, value, onChange }: Props) {
  return (
    <div className="toggle-group">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={`toggle-option ${opt.icon ? "has-icon" : ""} ${value === opt.value ? "active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.icon ? (
            <>
              <span className="toggle-option-icon">{opt.icon}</span>
              <span>{opt.label}</span>
            </>
          ) : (
            opt.label
          )}
        </button>
      ))}
    </div>
  );
}
