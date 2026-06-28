import { useEffect, useState } from "react";
import ToggleGroup from "./ToggleGroup";
import { IMPORTANCE_OPTIONS } from "./DiaryWriteForm";
import { deleteDiaryEntry, fetchDiaryEntries, updateDiaryEntry } from "../api";
import type { DiaryEntry, DiaryImportance } from "../types";

interface Props {
  account: string;
  refreshKey: number;
}

interface EditForm {
  entryDate: string;
  title: string;
  content: string;
  importance: DiaryImportance;
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
  };
}

function importanceClass(entry: DiaryEntry): string {
  if (entry.importance === "cuc_ky_cao") return "diary-leaf-cuc-ky-cao";
  if (entry.importance === "rat_cao") return "diary-leaf-rat-cao";
  return "";
}

function importanceLabel(importance: string | null): string {
  if (importance === "cuc_ky_cao") return "Cực Kì Cao";
  if (importance === "rat_cao") return "Rất Cao";
  return "Cao";
}

export default function DiaryTimeline({ account, refreshKey }: Props) {
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

  useEffect(() => {
    setLoading(true);
    fetchDiaryEntries(account)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [account, refreshKey, localRefresh]);

  function openEntry(entry: DiaryEntry) {
    setSelected(entry);
    setEditing(false);
    setEditForm(toEditForm(entry));
    setMessage(null);
  }

  function closeModal() {
    setSelected(null);
    setEditing(false);
    setShowDeleteConfirm(false);
    setMessage(null);
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
    <div className="diary-vine">
      <div className="diary-vine-stem" />
      {entries.map((entry, idx) => (
        <div key={entry.id} className={`diary-leaf-row ${idx % 2 === 0 ? "left" : "right"}`}>
          <div className="diary-leaf-node" />
          <button className={`diary-leaf-card ${importanceClass(entry)}`} onClick={() => openEntry(entry)}>
            <div className="diary-leaf-date">{formatVNDate(entry.entry_date)}</div>
            <div className="diary-leaf-title">{entry.title}</div>
          </button>
        </div>
      ))}

      {selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-sheet diary-modal-sheet" onClick={(e) => e.stopPropagation()}>
            {!editing ? (
              <>
                <div className="modal-header diary-modal-header">
                  <h3>🍃 {selected.title}</h3>
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
                  </div>
                </div>
                <p className="diary-modal-date">
                  {formatVNDate(selected.entry_date)} · Mức độ: {importanceLabel(selected.importance)}
                </p>
                <p className="diary-modal-content">{selected.content}</p>
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
                  </div>
                  {message && <div className="message error">{message}</div>}
                  <div className="modal-actions">
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setEditing(false);
                        setEditForm(toEditForm(selected));
                        setMessage(null);
                      }}
                      disabled={saving}
                    >
                      Hủy
                    </button>
                    <button className="save-button" onClick={handleSaveEdit} disabled={saving}>
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
    </div>
  );
}
