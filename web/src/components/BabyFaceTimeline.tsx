import { useEffect, useRef, useState } from "react";
import PhotoLightbox from "./PhotoLightbox";
import { createBabyFace, deleteBabyFace, deleteUpload, fetchBabyFaces, updateBabyFace, uploadImage } from "../api";
import { compressForUpload } from "../imageCompress";
import { todayDateStr } from "../dateUtils";
import type { BabyFace, Session } from "../types";

interface Props {
  session: Session;
}

function formatVNDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

function formatMonthLabel(dateStr: string): string {
  const [y, m] = dateStr.split("-");
  return `Tháng ${Number(m)}/${y}`;
}

export default function BabyFaceTimeline({ session }: Props) {
  const account = session.account;
  const [faces, setFaces] = useState<BabyFace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  // Thêm ảnh mới
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [newDate, setNewDate] = useState(todayDateStr());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Xem / sửa ngày / xoá ảnh đã có
  const [selected, setSelected] = useState<BabyFace | null>(null);
  const [editDate, setEditDate] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchBabyFaces(account)
      .then(setFaces)
      .finally(() => setLoading(false));
  }, [account, refresh]);

  useEffect(() => {
    return () => {
      if (newPreview) URL.revokeObjectURL(newPreview);
    };
  }, [newPreview]);

  function openAdd() {
    setAdding(true);
    setNewFile(null);
    setNewPreview(null);
    setNewDate(todayDateStr());
    setMessage(null);
  }

  function closeAdd() {
    if (saving) return;
    setAdding(false);
    setNewFile(null);
    setNewPreview(null);
    setMessage(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNewFile(file);
    setNewPreview(URL.createObjectURL(file));
    setMessage(null);
  }

  // Upload lúc bấm Lưu (không upload ngay khi chọn ảnh) để người dùng đổi ý/bấm Hủy thì
  // không để lại ảnh mồ côi trên Drive.
  async function handleSaveNew() {
    if (!newFile) {
      setMessage("Vui lòng chọn hoặc chụp 1 ảnh gương mặt bé");
      return;
    }
    if (!newDate) {
      setMessage("Vui lòng chọn ngày chụp");
      return;
    }
    setSaving(true);
    setMessage(null);
    let uploadedId: number | null = null;
    try {
      const compressed = await compressForUpload(newFile);
      const uploaded = await uploadImage(compressed, account, session.token);
      uploadedId = uploaded.id;
      await createBabyFace({ account, faceDate: newDate, photoUploadId: uploaded.id });
      setAdding(false);
      setNewFile(null);
      setNewPreview(null);
      setRefresh((k) => k + 1);
    } catch (err) {
      if (uploadedId !== null) deleteUpload(uploadedId, account, session.token).catch(() => {});
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  function openFace(face: BabyFace) {
    setSelected(face);
    setEditDate(face.face_date);
    setShowDeleteConfirm(false);
    setMessage(null);
  }

  function closeFace() {
    if (busy) return;
    setSelected(null);
    setShowDeleteConfirm(false);
    setMessage(null);
  }

  async function handleSaveDate() {
    if (!selected || !editDate) return;
    setBusy(true);
    setMessage(null);
    try {
      await updateBabyFace(selected.id, { account, faceDate: editDate, photoUploadId: selected.photo.id });
      setSelected(null);
      setRefresh((k) => k + 1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      await deleteBabyFace(selected.id, account);
      setSelected(null);
      setShowDeleteConfirm(false);
      setRefresh((k) => k + 1);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="face-screen">
      <div className="face-intro">
        <div className="face-intro-title">✨ The Face</div>
        <div className="face-intro-subtitle">Mỗi tháng 1 bức ảnh gương mặt — xem con lớn lên từng ngày</div>
      </div>

      {session.isPremium ? (
        <button type="button" className="face-add-tile" onClick={openAdd} aria-label="Thêm ảnh gương mặt">
          <span className="face-add-plus">+</span>
          <span className="face-add-label">Thêm ảnh</span>
        </button>
      ) : (
        <div className="message error">Tính năng The Face chỉ dành cho tài khoản Premium</div>
      )}

      {loading ? (
        <p className="loading-text">Đang tải...</p>
      ) : faces.length === 0 ? (
        <p className="loading-text">Chưa có ảnh nào. Chụp gương mặt đầu tiên của bé nhé! 👶</p>
      ) : (
        <div className="face-trunk">
          {faces.map((face, idx) => (
            <div key={face.id} className="face-trunk-item">
              <button type="button" className="face-trunk-photo" onClick={() => openFace(face)}>
                <img src={face.photo.thumb_url} alt={`Gương mặt bé ngày ${formatVNDate(face.face_date)}`} />
                {idx === 0 && <span className="face-trunk-latest">Mới nhất</span>}
              </button>
              <div className="face-trunk-date">
                <span className="face-trunk-month">{formatMonthLabel(face.face_date)}</span>
                <span className="face-trunk-day">{formatVNDate(face.face_date)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} hidden />

      {adding && (
        <div className="modal-overlay" onClick={closeAdd}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✨ Thêm gương mặt bé</h3>
              <button className="modal-close" onClick={closeAdd} aria-label="Đóng" disabled={saving}>
                ✕
              </button>
            </div>
            <button
              type="button"
              className="face-pick-box"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              {newPreview ? (
                <img src={newPreview} alt="Ảnh đã chọn" />
              ) : (
                <span className="face-pick-placeholder">
                  <span className="face-pick-icon">📷</span>
                  Chụp hoặc chọn 1 ảnh
                </span>
              )}
            </button>
            {newPreview && !saving && (
              <button type="button" className="face-pick-change" onClick={() => fileInputRef.current?.click()}>
                Đổi ảnh khác
              </button>
            )}
            <div className="note-form">
              <div className="field">
                <label className="field-label">Ngày chụp</label>
                <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} disabled={saving} />
              </div>
            </div>
            {message && <div className="message error">{message}</div>}
            <div className="modal-actions">
              <button className="secondary-button" onClick={closeAdd} disabled={saving}>
                Hủy
              </button>
              <button className="save-button" onClick={handleSaveNew} disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={closeFace}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✨ {formatMonthLabel(selected.face_date)}</h3>
              <button className="modal-close" onClick={closeFace} aria-label="Đóng" disabled={busy}>
                ✕
              </button>
            </div>
            <button
              type="button"
              className="face-pick-box"
              onClick={() => setLightboxIndex(faces.findIndex((f) => f.id === selected.id))}
            >
              <img src={selected.photo.thumb_url} alt="" />
            </button>
            {!showDeleteConfirm ? (
              <>
                <div className="note-form">
                  <div className="field">
                    <label className="field-label">Ngày chụp</label>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} disabled={busy} />
                  </div>
                </div>
                {message && <div className="message error">{message}</div>}
                <div className="modal-actions">
                  <button
                    className="secondary-button vaccine-delete-confirm"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={busy}
                  >
                    🗑️ Xóa
                  </button>
                  <button
                    className="save-button"
                    onClick={handleSaveDate}
                    disabled={busy || !editDate || editDate === selected.face_date}
                  >
                    {busy ? "Đang lưu..." : "Lưu ngày"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="pin-step-label">Ảnh ngày {formatVNDate(selected.face_date)} sẽ bị xóa vĩnh viễn.</p>
                {message && <div className="message error">{message}</div>}
                <div className="modal-actions">
                  <button className="secondary-button" onClick={() => setShowDeleteConfirm(false)} disabled={busy}>
                    Hủy
                  </button>
                  <button className="save-button vaccine-delete-confirm" onClick={handleDelete} disabled={busy}>
                    {busy ? "Đang xóa..." : "Xác nhận"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {lightboxIndex !== null && lightboxIndex >= 0 && (
        <PhotoLightbox
          photos={faces.map((f) => f.photo)}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
