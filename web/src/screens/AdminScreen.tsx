import { useCallback, useEffect, useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";
import ChangePinModal from "../components/ChangePinModal";
import {
  adminCreateAccount,
  adminDeleteAccount,
  adminListAccounts,
  adminResetPin,
  adminSetActive,
} from "../api";
import type { AccountSummary, Session } from "../types";
import type { Screen } from "../App";

interface Props {
  session: Session;
  onNavigate: (screen: Screen) => void;
  onSessionUpdate: (session: Session) => void;
}

export default function AdminScreen({ session, onNavigate, onSessionUpdate }: Props) {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [showChangePin, setShowChangePin] = useState(false);
  const [search, setSearch] = useState("");

  const [babyName, setBabyName] = useState("");
  const [newAccountId, setNewAccountId] = useState("");
  const [newAccountPin, setNewAccountPin] = useState("");
  const [creating, setCreating] = useState(false);

  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPin, setResetPin] = useState("");
  const [resetting, setResetting] = useState(false);
  const [togglingAccount, setTogglingAccount] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AccountSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) => a.account.toLowerCase().includes(q) || a.babyName.toLowerCase().includes(q)
    );
  }, [accounts, search]);

  const loadAccounts = useCallback(() => {
    setLoading(true);
    return adminListAccounts(session.token)
      .then(setAccounts)
      .finally(() => setLoading(false));
  }, [session.token]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  async function handleCreate() {
    if (!babyName.trim() || !newAccountId.trim() || !/^\d{4}$/.test(newAccountPin)) {
      setMessage({ kind: "error", text: "Vui lòng nhập đủ Tên bé, Tài khoản, và mã PIN 4 số" });
      return;
    }
    setCreating(true);
    setMessage(null);
    try {
      await adminCreateAccount(session.token, newAccountId.trim(), babyName.trim(), newAccountPin);
      setMessage({ kind: "success", text: "Đã tạo tài khoản mới! 🎉" });
      setBabyName("");
      setNewAccountId("");
      setNewAccountPin("");
      setShowCreateForm(false);
      loadAccounts();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Đã có lỗi xảy ra" });
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(account: string, nextActive: boolean) {
    setTogglingAccount(account);
    setMessage(null);
    try {
      await adminSetActive(session.token, account, nextActive);
      setMessage({
        kind: "success",
        text: nextActive ? `Đã kích hoạt "${account}"! 🎉` : `Đã vô hiệu hóa "${account}"`,
      });
      loadAccounts();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Đã có lỗi xảy ra" });
    } finally {
      setTogglingAccount(null);
    }
  }

  async function handleResetPin() {
    if (!resetTarget || !/^\d{4}$/.test(resetPin)) {
      setMessage({ kind: "error", text: "Vui lòng nhập mã PIN mới gồm 4 số" });
      return;
    }
    setResetting(true);
    setMessage(null);
    try {
      await adminResetPin(session.token, resetTarget, resetPin);
      setMessage({ kind: "success", text: `Đã đổi PIN cho "${resetTarget}"! 🎉` });
      setResetTarget(null);
      setResetPin("");
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Đã có lỗi xảy ra" });
    } finally {
      setResetting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setMessage(null);
    try {
      await adminDeleteAccount(session.token, deleteTarget.account);
      setMessage({ kind: "success", text: `Đã xóa tài khoản "${deleteTarget.account}"` });
      setDeleteTarget(null);
      loadAccounts();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Đã có lỗi xảy ra" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="screen admin-screen">
      <AppHeader onGoHome={() => onNavigate("HOME")} />
      <header className="screen-header">
        <button className="back-button" onClick={() => onNavigate("HOME")}>
          ←
        </button>
        <h2>Quản Trị Tài Khoản</h2>
        <button className="nav-switch-button" onClick={() => onNavigate("HOME")}>
          🏠 Trang chủ
        </button>
      </header>

      {message && <div className={`message ${message.kind}`}>{message.text}</div>}

      <div className="admin-quick-actions">
        <button className="big-card-button admin-quick-button" onClick={() => setShowCreateForm((s) => !s)}>
          <span className="big-card-icon">➕</span>
          <span className="big-card-label">Tạo User Mới</span>
        </button>
        <button className="big-card-button admin-quick-button" onClick={() => setShowChangePin(true)}>
          <span className="big-card-icon">🔒</span>
          <span className="big-card-label">Đổi PIN Admin</span>
        </button>
      </div>

      {showCreateForm && (
        <section className="month-section">
          <h3 className="month-section-title">➕ Tạo tài khoản mới</h3>
          <div className="note-form">
            <div className="field">
              <label className="field-label">Tên bé</label>
              <input type="text" placeholder="VD: Bé Kem" value={babyName} onChange={(e) => setBabyName(e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label">Tài khoản</label>
              <input
                type="text"
                placeholder="VD: bekem"
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">Mã PIN (4 số)</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="VD: 1234"
                value={newAccountPin}
                onChange={(e) => setNewAccountPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              />
            </div>
          </div>
          <button className="save-button" onClick={handleCreate} disabled={creating}>
            {creating ? "Đang tạo..." : "Tạo tài khoản"}
          </button>
        </section>
      )}

      <section className="month-section">
        <h3 className="month-section-title">👥 Danh sách tài khoản</h3>
        <input
          type="text"
          className="account-search-input"
          placeholder="🔍 Tìm theo tên bé hoặc tài khoản..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {loading && <p className="loading-text">Đang tải...</p>}
        {!loading && filteredAccounts.length === 0 && (
          <p className="loading-text">Không tìm thấy tài khoản nào</p>
        )}
        {!loading &&
          filteredAccounts.map((a) => (
            <div key={a.account} className="account-row">
              <div className="account-row-info">
                <div className="account-row-name">
                  {a.babyName} {a.isAdmin && <span className="account-admin-badge">Admin</span>}
                </div>
                <div className="account-row-id">@{a.account}</div>
              </div>
              {resetTarget === a.account ? (
                <div className="account-row-reset">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="PIN mới"
                    value={resetPin}
                    onChange={(e) => setResetPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  />
                  <button className="date-nav-button" onClick={handleResetPin} disabled={resetting}>
                    ✓
                  </button>
                  <button
                    className="date-nav-button"
                    onClick={() => {
                      setResetTarget(null);
                      setResetPin("");
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="account-row-actions">
                  <button
                    className={`account-active-toggle ${a.isActive ? "active" : "inactive"}`}
                    onClick={() => handleToggleActive(a.account, !a.isActive)}
                    disabled={togglingAccount === a.account}
                  >
                    {a.isActive ? "🟢 Active" : "🔴 Inactive"}
                  </button>
                  <button className="nav-switch-button" onClick={() => setResetTarget(a.account)}>
                    Đổi PIN
                  </button>
                  <button
                    className="account-delete-button"
                    onClick={() => setDeleteTarget(a)}
                    aria-label="Xóa tài khoản"
                    title="Xóa"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))}
      </section>

      {showChangePin && (
        <ChangePinModal
          session={session}
          onClose={() => setShowChangePin(false)}
          onSessionUpdate={onSessionUpdate}
        />
      )}

      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Xóa tài khoản?</h3>
            </div>
            <p className="pin-step-label">
              Tài khoản "{deleteTarget.babyName}" (@{deleteTarget.account}) và toàn bộ dữ liệu của tài khoản này sẽ bị
              xóa vĩnh viễn.
            </p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setDeleteTarget(null)}>
                Hủy
              </button>
              <button className="save-button vaccine-delete-confirm" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Đang xóa..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
