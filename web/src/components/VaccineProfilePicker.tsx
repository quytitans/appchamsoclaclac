import { useEffect, useState, type MouseEvent } from "react";
import { createVaccineProfile, deleteVaccineProfile, fetchVaccineProfiles, updateVaccineProfile } from "../api";
import { PROFILE_TYPE_META, PROFILE_TYPE_ORDER, profileIcon, profileTypeLabel } from "../vaccineProfileMeta";
import type { VaccineProfile, VaccineProfileType } from "../types";

interface Props {
  account: string;
  onSelect: (profile: VaccineProfile) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmails(raw: string): string[] {
  return [...new Set(raw.split(/[,;\n]/).map((e) => e.trim()).filter(Boolean))];
}

export default function VaccineProfilePicker({ account, onSelect }: Props) {
  const [profiles, setProfiles] = useState<VaccineProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<VaccineProfile | null>(null);
  const [name, setName] = useState("");
  const [profileType, setProfileType] = useState<VaccineProfileType>("baby");
  const [emailsInput, setEmailsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaccineProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  function load() {
    setLoading(true);
    return fetchVaccineProfiles(account)
      .then(setProfiles)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  function openCreate() {
    setEditingProfile(null);
    setName("");
    setProfileType("baby");
    setEmailsInput("");
    setError(null);
    setShowForm(true);
  }

  function openEdit(p: VaccineProfile, e: MouseEvent) {
    e.stopPropagation();
    setEditingProfile(p);
    setName(p.name);
    setProfileType(p.profileType);
    setEmailsInput(p.reminderEmails.join(", "));
    setError(null);
    setShowForm(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      setError("Vui lòng đặt tên cho sổ tiêm chủng");
      return;
    }
    const reminderEmails = parseEmails(emailsInput);
    const invalidEmail = reminderEmails.find((e) => !EMAIL_RE.test(e));
    if (invalidEmail) {
      setError(`Email không hợp lệ: ${invalidEmail}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingProfile) {
        await updateVaccineProfile(editingProfile.id, { account, name: name.trim(), profileType, reminderEmails });
        setShowForm(false);
        await load();
      } else {
        const created = await createVaccineProfile({ account, name: name.trim(), profileType, reminderEmails });
        setShowForm(false);
        await load();
        onSelect(created);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteVaccineProfile(deleteTarget.id, account);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="vaccine-profile-picker">
      {loading && <p className="loading-text">Đang tải...</p>}
      {!loading && (
        <div className="vaccine-profile-grid">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`vaccine-profile-card ${p.hasOverdueDose ? "vaccine-profile-card-overdue" : ""}`}
              onClick={() => onSelect(p)}
            >
              {p.hasOverdueDose && <span className="overdue-ribbon">Quá hạn</span>}
              <div className="vaccine-profile-card-actions">
                <button
                  type="button"
                  className="vaccine-profile-icon-btn"
                  onClick={(e) => openEdit(p, e)}
                  aria-label="Sửa sổ"
                  title="Sửa"
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="vaccine-profile-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(p);
                  }}
                  aria-label="Xóa sổ"
                  title="Xóa"
                >
                  🗑️
                </button>
              </div>
              <span className="vaccine-profile-icon">{profileIcon(p.profileType)}</span>
              <span className="vaccine-profile-name">{p.name}</span>
              <span className="vaccine-profile-type">{profileTypeLabel(p.profileType)}</span>
            </button>
          ))}
          <button type="button" className="vaccine-profile-card vaccine-profile-add" onClick={openCreate}>
            <span className="vaccine-profile-icon">➕</span>
            <span className="vaccine-profile-name">Tạo sổ mới</span>
          </button>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📔 {editingProfile ? "Sửa sổ tiêm chủng" : "Tạo sổ tiêm chủng mới"}</h3>
            </div>
            <div className="field">
              <label className="field-label">Tên</label>
              <input
                type="text"
                placeholder="VD: Bé Kem, Mướp, Bố..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label">Loại sổ</label>
              <div className="type-grid vaccine-profile-type-grid">
                {PROFILE_TYPE_ORDER.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`type-chip ${profileType === t ? "active" : ""}`}
                    onClick={() => setProfileType(t)}
                  >
                    <span className="type-chip-icon">{PROFILE_TYPE_META[t].icon}</span>
                    {PROFILE_TYPE_META[t].createLabel}
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="field-label">Email nhắc lịch tiêm (tùy chọn)</label>
              <textarea
                rows={2}
                placeholder="VD: me@gmail.com, bo@gmail.com (có thể nhập nhiều email, cách nhau bởi dấu phẩy hoặc xuống dòng)"
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
              />
              <p className="field-hint">Dùng để gửi nhắc lịch tiêm tự động qua email (tính năng sắp ra mắt).</p>
            </div>
            {error && <div className="message error">{error}</div>}
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setShowForm(false)} disabled={saving}>
                Hủy
              </button>
              <button className="save-button" onClick={handleSave} disabled={saving}>
                {saving ? "Đang lưu..." : editingProfile ? "Lưu thay đổi" : "Tạo sổ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Xóa sổ tiêm chủng?</h3>
            </div>
            <p className="pin-step-label">
              Sổ "{deleteTarget.name}" và toàn bộ vắc-xin, lịch sử các mũi tiêm trong sổ này sẽ bị xóa vĩnh viễn.
            </p>
            {error && <div className="message error">{error}</div>}
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Hủy
              </button>
              <button className="save-button vaccine-delete-confirm" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
