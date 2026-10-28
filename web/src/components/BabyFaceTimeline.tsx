import { useEffect, useMemo, useRef, useState } from "react";
import PhotoLightbox from "./PhotoLightbox";
import { createBabyFace, deleteBabyFace, deleteUpload, fetchBabyFaces, updateBabyFace, uploadImage } from "../api";
import FaceCropper, { type FaceCropperHandle } from "./FaceCropper";
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

interface DateQuery {
  year: number;
  month?: number;
  day?: number;
}

// Nhận "2026", "10/2026", "28/10/2026" (dấu phân cách / - . hoặc khoảng trắng), cả kiểu
// ISO "2026-10" / "2026-10-28"; bỏ qua chữ thừa như "tháng", "ngày". Sai định dạng → null.
function parseDateQuery(raw: string): DateQuery | null {
  const parts = raw.trim().split(/[^0-9]+/).filter(Boolean).map(Number);
  if (parts.length === 0) return null;
  if (parts.length > 1 && String(parts[0]).length === 4) parts.reverse();
  const year = parts[parts.length - 1];
  if (year < 1000 || year > 9999) return null;
  let q: DateQuery | null = null;
  if (parts.length === 1) q = { year };
  else if (parts.length === 2) q = { year, month: parts[0] };
  else if (parts.length === 3) q = { year, month: parts[1], day: parts[0] };
  if (!q) return null;
  if (q.month !== undefined && (q.month < 1 || q.month > 12)) return null;
  if (q.day !== undefined && (q.day < 1 || q.day > 31)) return null;
  return q;
}

function matchesDateQuery(dateStr: string, q: DateQuery): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  return y === q.year && (q.month === undefined || m === q.month) && (q.day === undefined || d === q.day);
}

export default function BabyFaceTimeline({ session }: Props) {
  const account = session.account;
  const [faces, setFaces] = useState<BabyFace[]>([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  // Thêm ảnh mới
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<FaceCropperHandle>(null);
  const [adding, setAdding] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newDate, setNewDate] = useState(todayDateStr());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Xem / sửa ngày / xoá ảnh đã có
  const [selected, setSelected] = useState<BabyFace | null>(null);
  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const dateFilter = useMemo(() => parseDateQuery(search), [search]);
  const visibleFaces = useMemo(() => {
    if (!search.trim()) return faces;
    if (!dateFilter) return [];
    return faces.filter((f) => matchesDateQuery(f.face_date, dateFilter));
  }, [faces, search, dateFilter]);

  useEffect(() => {
    setLoading(true);
    fetchBabyFaces(account)
      .then(setFaces)
      .finally(() => setLoading(false));
  }, [account, refresh]);

  function openAdd() {
    setAdding(true);
    setNewFile(null);
    setNewDate(todayDateStr());
    setMessage(null);
  }

  function closeAdd() {
    if (saving) return;
    setAdding(false);
    setNewFile(null);
    setMessage(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setNewFile(file);
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
      const compressed = await cropperRef.current!.crop();
      const uploaded = await uploadImage(compressed, account, session.token);
      uploadedId = uploaded.id;
      await createBabyFace({ account, faceDate: newDate, photoUploadId: uploaded.id });
      setAdding(false);
      setNewFile(null);
      setRefresh((k) => k + 1);
    } catch (err) {
      if (uploadedId !== null) deleteUpload(uploadedId, account, session.token).catch(() => {});
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  function resetEdit(face: BabyFace) {
    setEditing(false);
    setEditDate(face.face_date);
    setEditFile(null);
    setMessage(null);
  }

  function openFace(face: BabyFace) {
    setSelected(face);
    resetEdit(face);
    setShowDeleteConfirm(false);
  }

  function closeFace() {
    if (busy) return;
    setSelected(null);
    setEditing(false);
    setEditFile(null);
    setShowDeleteConfirm(false);
    setMessage(null);
  }

  function handleEditFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setEditFile(file);
    setMessage(null);
  }

  // Đổi ảnh: upload ảnh mới trước rồi mới PUT — server tự dọn ảnh cũ trên Drive khi id đổi.
  // Nếu PUT lỗi thì xoá ảnh vừa upload để không mồ côi; ảnh cũ vẫn giữ nguyên.
  async function handleSaveEdit() {
    if (!selected) return;
    if (!editDate) {
      setMessage("Vui lòng chọn ngày chụp");
      return;
    }
    setBusy(true);
    setMessage(null);
    let uploadedId: number | null = null;
    try {
      let photoUploadId = selected.photo.id;
      if (editFile) {
        const compressed = await cropperRef.current!.crop();
        const uploaded = await uploadImage(compressed, account, session.token);
        uploadedId = uploaded.id;
        photoUploadId = uploaded.id;
      }
      const updated = await updateBabyFace(selected.id, { account, faceDate: editDate, photoUploadId });
      uploadedId = null;
      setSelected(updated);
      resetEdit(updated);
      setRefresh((k) => k + 1);
    } catch (err) {
      if (uploadedId !== null) deleteUpload(uploadedId, account, session.token).catch(() => {});
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

      {!loading && faces.length > 0 && (
        <>
          <input
            type="text"
            className="account-search-input face-search-input"
            placeholder="🔍 Tìm theo ngày: 28/10/2026, 10/2026 hoặc 2026"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search.trim() && (
            <div className={`face-search-result${dateFilter ? "" : " face-search-invalid"}`}>
              {dateFilter
                ? `Tìm thấy ${visibleFaces.length} ảnh`
                : "Nhập ngày/tháng/năm (28/10/2026), tháng/năm (10/2026) hoặc năm (2026)"}
            </div>
          )}
        </>
      )}

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
        <>
          {visibleFaces.length === 0 ? (
            dateFilter && <p className="loading-text">Không có ảnh nào trong thời gian này</p>
          ) : (
        <div className="face-trunk">
          {visibleFaces.map((face) => (
            <div key={face.id} className="face-trunk-item">
              <button type="button" className="face-trunk-photo" onClick={() => openFace(face)}>
                <img src={face.photo.thumb_url} alt={`Gương mặt bé ngày ${formatVNDate(face.face_date)}`} />
                {face.id === faces[0].id && <span className="face-trunk-latest">Mới nhất</span>}
              </button>
              <div className="face-trunk-date">
                <span className="face-trunk-month">{formatMonthLabel(face.face_date)}</span>
                <span className="face-trunk-day">{formatVNDate(face.face_date)}</span>
              </div>
            </div>
          ))}
        </div>
          )}
        </>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} hidden />
      <input ref={editFileInputRef} type="file" accept="image/*" onChange={handleEditFileChange} hidden />

      {adding && (
        <div className="modal-overlay" onClick={closeAdd}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✨ Thêm gương mặt bé</h3>
              <button className="modal-close" onClick={closeAdd} aria-label="Đóng" disabled={saving}>
                ✕
              </button>
            </div>
            {newFile ? (
              <FaceCropper file={newFile} ref={cropperRef} />
            ) : (
              <button
                type="button"
                className="face-pick-box"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
              >
                <span className="face-pick-placeholder">
                  <span className="face-pick-icon">📷</span>
                  Chụp hoặc chọn 1 ảnh
                </span>
              </button>
            )}
            {newFile && !saving && (
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
            <div className="modal-header diary-modal-header">
              <h3>{editing ? "✏️ Sửa ảnh" : `✨ ${formatMonthLabel(selected.face_date)}`}</h3>
              <div className="diary-modal-actions">
                {!editing && !showDeleteConfirm && (
                  <>
                    <button
                      className="dose-icon-button"
                      onClick={() => setEditing(true)}
                      aria-label="Sửa ảnh"
                      title="Sửa"
                    >
                      ✏️
                    </button>
                    <button
                      className="dose-icon-button dose-icon-delete"
                      onClick={() => setShowDeleteConfirm(true)}
                      aria-label="Xóa ảnh"
                      title="Xóa"
                    >
                      🗑️
                    </button>
                  </>
                )}
                <button className="modal-close" onClick={closeFace} aria-label="Đóng" disabled={busy}>
                  ✕
                </button>
              </div>
            </div>
            {editing ? (
              <>
                {editFile ? (
                  <FaceCropper file={editFile} ref={cropperRef} />
                ) : (
                  <button
                    type="button"
                    className="face-pick-box"
                    onClick={() => editFileInputRef.current?.click()}
                    disabled={busy}
                  >
                    <img src={selected.photo.thumb_url} alt="" />
                  </button>
                )}
                {!busy && (
                  <button type="button" className="face-pick-change" onClick={() => editFileInputRef.current?.click()}>
                    📷 Chụp hoặc chọn ảnh khác
                  </button>
                )}
                <div className="note-form">
                  <div className="field">
                    <label className="field-label">Ngày chụp</label>
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} disabled={busy} />
                  </div>
                </div>
                {message && <div className="message error">{message}</div>}
                <div className="modal-actions">
                  <button className="secondary-button" onClick={() => resetEdit(selected)} disabled={busy}>
                    Hủy
                  </button>
                  <button
                    className="save-button"
                    onClick={handleSaveEdit}
                    disabled={busy || !editDate || (!editFile && editDate === selected.face_date)}
                  >
                    {busy ? "Đang lưu..." : "Lưu"}
                  </button>
                </div>
              </>
            ) : !showDeleteConfirm ? (
              <>
                <button
                  type="button"
                  className="face-pick-box face-view-box"
                  onClick={() => setLightboxIndex(faces.findIndex((f) => f.id === selected.id))}
                >
                  <img src={selected.photo.thumb_url} alt="" />
                </button>
                <div className="face-view-date">📅 {formatVNDate(selected.face_date)}</div>
                {message && <div className="message error">{message}</div>}
                <div className="modal-actions">
                  <button className="save-button" onClick={closeFace}>
                    Đóng
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
