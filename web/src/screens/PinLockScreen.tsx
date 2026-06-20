import { useState } from "react";
import PinInput from "../components/PinInput";
import { verifyPin } from "../api";

interface Props {
  onUnlock: () => void;
}

export default function PinLockScreen({ onUnlock }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [checking, setChecking] = useState(false);

  async function handleComplete(pin: string) {
    setChecking(true);
    setError(null);
    try {
      const res = await verifyPin(pin);
      if (res.valid) {
        onUnlock();
      } else {
        setError("Sai mã PIN, vui lòng thử lại");
        setResetKey((k) => k + 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
      setResetKey((k) => k + 1);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="screen pin-lock-screen">
      <div className="home-emoji">🔒</div>
      <h1 className="app-title">Lạc Lạc Bé Yêu</h1>
      <p className="app-subtitle">Nhập mã PIN để tiếp tục</p>
      <PinInput onComplete={handleComplete} resetKey={resetKey} />
      {checking && <p className="loading-text">Đang kiểm tra...</p>}
      {error && <div className="message error">{error}</div>}
    </div>
  );
}
