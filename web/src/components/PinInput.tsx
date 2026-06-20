import { useEffect, useRef, useState, type KeyboardEvent } from "react";

interface Props {
  length?: number;
  onComplete: (pin: string) => void;
  resetKey?: number | string;
}

export default function PinInput({ length = 4, onComplete, resetKey }: Props) {
  const [values, setValues] = useState<string[]>(() => Array(length).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setValues(Array(length).fill(""));
    inputsRef.current[0]?.focus();
  }, [resetKey, length]);

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    const next = [...values];
    next[index] = digit;
    setValues(next);
    if (digit && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
    if (next.every((v) => v !== "")) {
      onComplete(next.join(""));
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  return (
    <div className="pin-input-group">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          autoFocus={index === 0}
          className="pin-box"
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
        />
      ))}
    </div>
  );
}
