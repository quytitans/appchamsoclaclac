interface ToggleOption {
  value: string;
  label: string;
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
          className={`toggle-option ${value === opt.value ? "active" : ""}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
