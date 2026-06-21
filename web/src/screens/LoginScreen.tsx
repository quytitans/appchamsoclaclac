import { useState } from "react";
import PinInput from "../components/PinInput";
import { login } from "../api";
import type { Session } from "../types";

interface Props {
  onLogin: (session: Session) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [accountMode, setAccountMode] = useState<"laclac" | "other">("laclac");
  const [otherAccount, setOtherAccount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [checking, setChecking] = useState(false);

  const account = accountMode === "laclac" ? "laclac" : otherAccount.trim();

  async function handleComplete(pin: string) {
    if (!account) {
      setError("Vui lòng nhập tài khoản");
      setResetKey((k) => k + 1);
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const session = await login(account, pin);
      onLogin(session);
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
      <h1 className="app-title">Trộm Vía Trộm Vía</h1>
      <p className="app-subtitle">Chọn tài khoản và nhập mã PIN</p>

      <div className="account-toggle">
        <button
          type="button"
          className={`account-radio ${accountMode === "laclac" ? "active" : ""}`}
          onClick={() => {
            setAccountMode("laclac");
            setOtherAccount("");
            setError(null);
            setResetKey((k) => k + 1);
          }}
        >
          🍼 Lạc Lạc
        </button>
        <button
          type="button"
          className={`account-radio ${accountMode === "other" ? "active" : ""}`}
          onClick={() => {
            setAccountMode("other");
            setError(null);
            setResetKey((k) => k + 1);
          }}
        >
          👤 Khác
        </button>
      </div>

      {accountMode === "other" && (
        <input
          type="text"
          className="account-input"
          placeholder="Nhập tên tài khoản"
          value={otherAccount}
          onChange={(e) => setOtherAccount(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      )}

      <PinInput onComplete={handleComplete} resetKey={resetKey} />
      {checking && <p className="loading-text">Đang kiểm tra...</p>}
      {error && <div className="message error">{error}</div>}
    </div>
  );
}
