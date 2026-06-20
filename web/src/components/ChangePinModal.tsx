import { useState } from "react";
import PinInput from "./PinInput";
import { changePin, verifyPin } from "../api";

interface Props {
  onClose: () => void;
}

export default function ChangePinModal({ onClose }: Props) {
  const [step, setStep] = useState<"current" | "new">("current");
  const [currentPin, setCurrentPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleCurrentComplete(pin: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await verifyPin(pin);
      if (res.valid) {
        setCurrentPin(pin);
        setStep("new");
      } else {
        setError("Mã PIN hiện tại không đúng");
        setResetKey((k) => k + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
      setResetKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  async function handleNewComplete(pin: string) {
    setBusy(true);
    setError(null);
    try {
      await changePin(currentPin, pin);
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
      setResetKey((k) => k + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🔒 Đổi Mã PIN</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {success ? (
          <div className="message success">Đã đổi mã PIN thành công! 🎉</div>
        ) : (
          <>
            <p className="pin-step-label">
              {step === "current" ? "Nhập mã PIN hiện tại" : "Nhập mã PIN mới"}
            </p>
            <PinInput
              key={step}
              onComplete={step === "current" ? handleCurrentComplete : handleNewComplete}
              resetKey={resetKey}
            />
            {busy && <p className="loading-text">Đang xử lý...</p>}
            {error && <div className="message error">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}
