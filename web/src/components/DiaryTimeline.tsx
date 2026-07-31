import { useEffect, useMemo, useState } from "react";
import ToggleGroup from "./ToggleGroup";
import PhotoPicker from "./PhotoPicker";
import PhotoLightbox from "./PhotoLightbox";
import { IMPORTANCE_OPTIONS } from "./DiaryWriteForm";
import { deleteDiaryEntry, fetchDiaryEntries, updateDiaryEntry } from "../api";
import type { DiaryEntry, DiaryImportance, Session, UploadedImage } from "../types";

interface Props {
  session: Session;
  refreshKey: number;
}

interface EditForm {
  entryDate: string;
  title: string;
  content: string;
  importance: DiaryImportance;
  photos: UploadedImage[];
}

function formatVNDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function toEditForm(entry: DiaryEntry): EditForm {
  return {
    entryDate: entry.entry_date,
    title: entry.title,
    content: entry.content,
    importance: (entry.importance as DiaryImportance) ?? "cao",
    photos: entry.photos,
  };
}

function importanceAccentClass(entry: DiaryEntry): string {
  if (entry.importance === "cuc_ky_cao") return "diary-accent-cuc-ky-cao";
  if (entry.importance === "rat_cao") return "diary-accent-rat-cao";
  return "diary-accent-cao";
}

function importanceIcon(entry: DiaryEntry): string {
  if (entry.importance === "cuc_ky_cao") return "💎";
  if (entry.importance === "rat_cao") return "🌸";
  return "🍃";
}

function importanceLabel(importance: string | null): string {
  if (importance === "cuc_ky_cao") return "Cực Kì Cao";
  if (importance === "rat_cao") return "Rất Cao";
  return "Cao";
}

export default function DiaryTimeline({ session, refreshKey }: Props) {
  const account = session.account;
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DiaryEntry | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);
  const [lightbox, setLightbox] = useState<{ photos: UploadedImage[]; index: number } | null>(null);
  const [photosBusy, setPhotosBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"timeline" | "gallery">("timeline");

  useEffect(() => {
    setLoading(true);
    fetchDiaryEntries(account)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [account, refreshKey, localRefresh]);

  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.title.toLowerCase().includes(q));
  }, [entries, search]);

  const galleryEntries = useMemo(() => filteredEntries.filter((e) => e.photos.length > 0), [filteredEntries]);

  function openEntry(entry: DiaryEntry) {
    setSelected(entry);
    setEditing(false);
    setEditForm(toEditForm(entry));
    setMessage(null);
    setLightbox(null);
    setPhotosBusy(false);
  }

  function closeModal() {
    setSelected(null);
    setEditing(false);
    setShowDeleteConfirm(false);
    setMessage(null);
    setLightbox(null);
    setPhotosBusy(false);
  }

  async function handleSaveEdit() {
    if (!selected || !editForm) return;
    if (!editForm.title.trim() || !editForm.content.trim()) {
      setMessage("Vui lòng nhập tiêu đề và nội dung");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const updated = await updateDiaryEntry(selected.id, {
        account,
        entryDate: editForm.entryDate,
        title: editForm.title.trim(),
        content: editForm.content.trim(),
        importance: editForm.importance,
        photoUploadIds: editForm.photos.map((p) => p.id),
      });
      setSelected(updated);
      setEditing(false);
      setLocalRefresh((k) => k + 1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    try {
      await deleteDiaryEntry(selected.id, account);
      setShowDeleteConfirm(false);
      closeModal();
      setLocalRefresh((k) => k + 1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <p className="loading-text">Đang tải...</p>;
  if (entries.length === 0) {
    return <p className="loading-text">Chưa có nhật ký nào. Hãy viết nhật ký đầu tiên! 🌱</p>;
  }

  return (
    <div>
      <div className="diary-view-mode-toggle">
        <ToggleGroup
          options={[
            { value: "timeline", label: "🕓 Timeline" },
            { value: "gallery", label: "🖼️ Bộ Sưu Tập Ảnh" },
          ]}
          value={viewMode}
          onChange={(v) => setViewMode(v as "timeline" | "gallery")}
        />
      </div>

      <input
        type="text"
        className="account-search-input"
        placeholder="🔍 Tìm nhật ký theo tên..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {viewMode === "timeline" ? (
        filteredEntries.length === 0 ? (
          <p className="loading-text">Không tìm thấy nhật ký nào phù hợp</p>
        ) : (
          <div className="diary-timeline">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className={`diary-entry-row ${importanceAccentClass(entry)}`}>
                <span className="diary-entry-dot">{importanceIcon(entry)}</span>
                <button className="diary-entry-card" onClick={() => openEntry(entry)}>
                  <div className="diary-entry-top">
                    <span className="diary-entry-date">{formatVNDate(entry.entry_date)}</span>
                    <div className="diary-entry-badges">
                      {entry.photos.length > 0 && (
                        <span className="diary-entry-photo-badge">📷 {entry.photos.length}</span>
                      )}
                      <span className="diary-entry-importance-badge">{importanceLabel(entry.importance)}</span>
                    </div>
                  </div>
                  <div className="diary-entry-title">{entry.title}</div>
                  {entry.content && <div className="diary-entry-preview">{entry.content}</div>}
                </button>
              </div>
            ))}
          </div>
        )
      ) : galleryEntries.length === 0 ? (
        <p className="loading-text">
          {search.trim() ? "Không tìm thấy nhật ký nào phù hợp" : "Chưa có nhật ký nào có ảnh"}
        </p>
      ) : (
        <div className="diary-gallery">
          {galleryEntries.map((entry) => (
            <div key={entry.id} className={`diary-album-card ${importanceAccentClass(entry)}`}>
              <button type="button" className="diary-album-header" onClick={() => openEntry(entry)}>
                <span className={`diary-album-icon ${importanceAccentClass(entry)}`}>{importanceIcon(entry)}</span>
                <span className="diary-album-header-text">
                  <span className="diary-album-title">{entry.title}</span>
                  <span className="diary-album-date">{formatVNDate(entry.entry_date)}</span>
                </span>
                <span className="diary-album-count">{entry.photos.length} ảnh</span>
              </button>
              <div className="diary-photo-grid">
                {entry.photos.map((photo, i) => (
                  <button
                    key={photo.id}
                    type="button"
                    className="diary-photo-thumb"
                    onClick={() => setLightbox({ photos: entry.photos, index: i })}
                  >
                    <img src={photo.thumb_url} alt="" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="diary-page-overlay" onClick={closeModal}>
          <div
            className={`diary-page-sheet ${!editing ? importanceAccentClass(selected) : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            {!editing ? (
              <>
                <div className="modal-header diary-modal-header">
                  <h3>
                    {importanceIcon(selected)} {selected.title}
                  </h3>
                  <div className="diary-modal-actions">
                    <button
                      className="dose-icon-button"
                      onClick={() => setEditing(true)}
                      aria-label="Sửa nhật ký"
                      title="Sửa"
                    >
                      ✏️
                    </button>
                    <button
                      className="dose-icon-button dose-icon-delete"
                      onClick={() => setShowDeleteConfirm(true)}
                      aria-label="Xóa nhật ký"
                      title="Xóa"
                    >
                      🗑️
                    </button>
                    <button className="modal-close" onClick={closeModal} aria-label="Đóng">
                      ✕
                    </button>
                  </div>
                </div>
                <div className="diary-modal-meta">
                  <span className="diary-modal-date-badge">{formatVNDate(selected.entry_date)}</span>
                  <span className={`diary-modal-importance-badge ${importanceAccentClass(selected)}`}>
                    {importanceIcon(selected)} {importanceLabel(selected.importance)}
                  </span>
                </div>
                <p className="diary-modal-content">{selected.content}</p>
                {selected.photos.length > 0 && (
                  <div className="diary-photo-grid">
                    {selected.photos.map((photo, i) => (
                      <button
                        key={photo.id}
                        type="button"
                        className="diary-photo-thumb"
                        onClick={() => setLightbox({ photos: selected.photos, index: i })}
                      >
                        <img src={photo.thumb_url} alt="" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="modal-actions">
                  <button className="save-button" onClick={closeModal}>
                    Đóng
                  </button>
                </div>
              </>
            ) : (
              editForm && (
                <>
                  <div className="modal-header">
                    <h3>✏️ Sửa nhật ký</h3>
                  </div>
                  <div className="note-form">
                    <div className="field">
                      <label className="field-label">Ngày</label>
                      <input
                        type="date"
                        value={editForm.entryDate}
                        onChange={(e) => setEditForm({ ...editForm, entryDate: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">Tiêu đề</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">Nội dung</label>
                      <textarea
                        rows={10}
                        value={editForm.content}
                        onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">Mức độ quan trọng của kỷ niệm</label>
                      <ToggleGroup
                        options={IMPORTANCE_OPTIONS}
                        value={editForm.importance}
                        onChange={(v) => setEditForm({ ...editForm, importance: v as DiaryImportance })}
                      />
                    </div>
                    {session.isPremium && (
                      <div className="field">
                        <label className="field-label">📷 Ảnh (tối đa 12)</label>
                        <PhotoPicker
                          account={session.account}
                          token={session.token}
                          value={editForm.photos}
                          onChange={(updater) =>
                            setEditForm((prev) => (prev ? { ...prev, photos: updater(prev.photos) } : prev))
                          }
                          onBusyChange={setPhotosBusy}
                          max={12}
                        />
                      </div>
                    )}
                  </div>
                  {photosBusy && <div className="message error">Đang xử lý ảnh, vui lòng đợi...</div>}
                  {message && <div className="message error">{message}</div>}
                  <div className="modal-actions">
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setEditing(false);
                        setEditForm(toEditForm(selected));
                        setMessage(null);
                        setPhotosBusy(false);
                      }}
                      disabled={saving}
                    >
                      Hủy
                    </button>
                    <button className="save-button" onClick={handleSaveEdit} disabled={saving || photosBusy}>
                      {saving ? "Đang lưu..." : "Lưu"}
                    </button>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}

      {showDeleteConfirm && selected && (
        <div className="modal-overlay">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Xóa nhật ký?</h3>
            </div>
            <p className="pin-step-label">Nhật ký "{selected.title}" sẽ bị xóa vĩnh viễn.</p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                Hủy
              </button>
              <button className="save-button vaccine-delete-confirm" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Đang xóa..." : "Xác nhận"}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <PhotoLightbox photos={lightbox.photos} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
