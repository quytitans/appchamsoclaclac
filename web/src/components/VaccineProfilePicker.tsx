import { useEffect, useState } from "react";
import { createVaccineProfile, fetchVaccineProfiles } from "../api";
import { PROFILE_TYPE_META, PROFILE_TYPE_ORDER, profileIcon, profileTypeLabel } from "../vaccineProfileMeta";
import type { VaccineProfile, VaccineProfileType } from "../types";

interface Props {
  account: string;
  onSelect: (profile: VaccineProfile) => void;
}

export default function VaccineProfilePicker({ account, onSelect }: Props) {
  const [profiles, setProfiles] = useState<VaccineProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [profileType, setProfileType] = useState<VaccineProfileType>("baby");
  const [emailsInput, setEmailsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setName("");
    setProfileType("baby");
    setEmailsInput("");
    setError(null);
    setShowCreate(true);
  }

  function parseEmails(raw: string): string[] {
    return [...new Set(raw.split(/[,;\n]/).map((e) => e.trim()).filter(Boolean))];
  }

  async function handleCreate() {
    if (!name.trim()) {
      setError("Vui lòng đặt tên cho sổ tiêm chủng");
      return;
    }
    const reminderEmails = parseEmails(emailsInput);
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmail = reminderEmails.find((e) => !emailRe.test(e));
    if (invalidEmail) {
      setError(`Email không hợp lệ: ${invalidEmail}`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createVaccineProfile({
        account,
        name: name.trim(),
        profileType,
        reminderEmails,
      });
      setShowCreate(false);
      await load();
      onSelect(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="vaccine-profile-picker">
      {loading && <p className="loading-text">Đang tải...</p>}
      {!loading && (
        <div className="vaccine-profile-grid">
          {profiles.map((p) => (
            <button key={p.id} type="button" className="vaccine-profile-card" onClick={() => onSelect(p)}>
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

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📔 Tạo sổ tiêm chủng mới</h3>
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
              <button className="secondary-button" onClick={() => setShowCreate(false)} disabled={saving}>
                Hủy
              </button>
              <button className="save-button" onClick={handleCreate} disabled={saving}>
                {saving ? "Đang tạo..." : "Tạo sổ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
