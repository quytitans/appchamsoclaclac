import { useState } from "react";
import ToggleGroup from "./ToggleGroup";
import { createDiaryEntry } from "../api";
import { todayDateStr } from "../dateUtils";
import type { DiaryImportance } from "../types";

export const IMPORTANCE_OPTIONS = [
  { value: "cao", label: "Cao" },
  { value: "rat_cao", label: "Rất Cao" },
  { value: "cuc_ky_cao", label: "Cực Kì Cao" },
];

interface Props {
  account: string;
  onSaved: () => void;
}

export default function DiaryWriteForm({ account, onSaved }: Props) {
  const [entryDate, setEntryDate] = useState(todayDateStr());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [importance, setImportance] = useState<DiaryImportance>("cao");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  function handleSaveClick() {
    if (!title.trim() || !content.trim()) {
      setMessage("Vui lòng nhập tiêu đề và nội dung");
      return;
    }
    setMessage(null);
    setShowConfirm(true);
  }

  async function handleConfirm() {
    setSaving(true);
    setMessage(null);
    try {
      await createDiaryEntry({ account, entryDate, title: title.trim(), content: content.trim(), importance });
      setShowConfirm(false);
      setEntryDate(todayDateStr());
      setTitle("");
      setContent("");
      setImportance("cao");
      onSaved();
    } catch (err) {
      setShowConfirm(false);
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setShowConfirm(false);
  }

  return (
    <div className="note-form">
      <div className="field">
        <label className="field-label">Ngày</label>
        <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label">Tiêu đề</label>
        <input
          type="text"
          placeholder="VD: Lần đầu con biết lật"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="field-label">Nội dung</label>
        <textarea
          rows={12}
          placeholder="Viết những điều mẹ muốn lưu giữ..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      <div className="field">
        <label className="field-label">Mức độ quan trọng của kỷ niệm</label>
        <ToggleGroup
          options={IMPORTANCE_OPTIONS}
          value={importance}
          onChange={(v) => setImportance(v as DiaryImportance)}
        />
      </div>

      {message && <div className="message error">{message}</div>}

      <button className="save-button" onClick={handleSaveClick} disabled={saving}>
        {saving ? "Đang lưu..." : "Lưu Nhật Ký"}
      </button>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Xác nhận lưu nhật ký?</h3>
            </div>
            <p className="pin-step-label">Lưu "{title.trim()}" và chuyển sang xem Nhật Ký của Mẹ?</p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={handleCancel} disabled={saving}>
                Cancel
              </button>
              <button className="save-button" onClick={handleConfirm} disabled={saving}>
                {saving ? "Đang lưu..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
