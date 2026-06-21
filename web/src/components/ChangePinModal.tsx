import { useState } from "react";
import PinInput from "./PinInput";
import { changePin } from "../api";
import type { Session } from "../types";

interface Props {
  session: Session;
  onClose: () => void;
  onSessionUpdate: (session: Session) => void;
}

export default function ChangePinModal({ session, onClose, onSessionUpdate }: Props) {
  const [step, setStep] = useState<"current" | "new">("current");
  const [currentPin, setCurrentPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  function handleCurrentComplete(pin: string) {
    setCurrentPin(pin);
    setError(null);
    setStep("new");
  }

  async function handleNewComplete(pin: string) {
    setBusy(true);
    setError(null);
    try {
      const newSession = await changePin(session.account, currentPin, pin);
      onSessionUpdate(newSession);
      setSuccess(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
      setStep("current");
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
