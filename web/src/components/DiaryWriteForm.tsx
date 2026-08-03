import { useState } from "react";
import DiaryImportancePicker from "./DiaryImportancePicker";
import PhotoPicker from "./PhotoPicker";
import { createDiaryEntry } from "../api";
import { todayDateStr } from "../dateUtils";
import type { DiaryImportance, Session, UploadedImage } from "../types";

interface Props {
  session: Session;
  onSaved: () => void;
}

export default function DiaryWriteForm({ session, onSaved }: Props) {
  const [entryDate, setEntryDate] = useState(todayDateStr());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [importance, setImportance] = useState<DiaryImportance>("cao");
  const [photos, setPhotos] = useState<UploadedImage[]>([]);
  const [photosBusy, setPhotosBusy] = useState(false);
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
      await createDiaryEntry({
        account: session.account,
        entryDate,
        title: title.trim(),
        content: content.trim(),
        importance,
        photoUploadIds: photos.map((p) => p.id),
      });
      setShowConfirm(false);
      setEntryDate(todayDateStr());
      setTitle("");
      setContent("");
      setImportance("cao");
      setPhotos([]);
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
    <div className="vaccine-form">
      <div className="entry-form-card">
        <div className="entry-form-header">
          <span className="entry-form-header-icon">📔</span>
          <div>
            <div className="entry-form-header-title">Viết kỷ niệm mới</div>
            <div className="entry-form-header-subtitle">Lưu lại khoảnh khắc đáng nhớ của con</div>
          </div>
        </div>

        <div className="note-form">
          <div className="form-section">
            <div className="form-section-title">
              <span className="form-section-icon">🗓️</span> Thông tin chung
            </div>
            <div className="field">
              <label className="field-label">Ngày</label>
              <div className="input-icon-wrap">
                <span className="input-icon">📅</span>
                <input
                  className="input-with-icon"
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Tiêu đề</label>
              <div className="input-icon-wrap">
                <span className="input-icon">✏️</span>
                <input
                  className="input-with-icon"
                  type="text"
                  placeholder="VD: Lần đầu con biết lật"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">
              <span className="form-section-icon">💭</span> Nội dung
            </div>
            <div className="field">
              <label className="field-label">Nội dung</label>
              <textarea
                rows={10}
                placeholder="Viết những điều mẹ muốn lưu giữ..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">
              <span className="form-section-icon">⭐</span> Mức độ quan trọng
            </div>
            <div className="field">
              <DiaryImportancePicker value={importance} onChange={setImportance} />
            </div>
          </div>

          {session.isPremium && (
            <div className="form-section">
              <div className="form-section-title">
                <span className="form-section-icon">📷</span> Ảnh (tối đa 24)
              </div>
              <div className="field">
                <PhotoPicker
                  account={session.account}
                  token={session.token}
                  value={photos}
                  onChange={setPhotos}
                  onBusyChange={setPhotosBusy}
                  max={24}
                />
              </div>
            </div>
          )}
        </div>

        {message && <div className="message error">{message}</div>}

        {photosBusy && <div className="message error">Đang xử lý ảnh, vui lòng đợi...</div>}

        <button className="save-button" onClick={handleSaveClick} disabled={saving || photosBusy}>
          {saving ? "Đang lưu..." : "Lưu Nhật Ký"}
        </button>
      </div>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Xác nhận lưu nhật ký?</h3>
            </div>
            <p className="pin-step-label">Lưu "{title.trim()}" và chuyển sang xem Nhật Ký của Mẹ?</p>
            <div className="modal-actions">
              <button className="secondary-button" onClick={handleCancel} disabled={saving}>
                Hủy
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
