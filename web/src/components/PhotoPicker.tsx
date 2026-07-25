import { useEffect, useRef, useState } from "react";
import { uploadImage, deleteUpload } from "../api";
import { compressForUpload } from "../imageCompress";
import type { UploadedImage } from "../types";

interface PendingSlot {
  key: string;
  previewUrl: string;
  uploading: boolean;
  error: string | null;
  file: File;
}

interface Props {
  account: string;
  token: string;
  value: UploadedImage[];
  onChange: (updater: (prev: UploadedImage[]) => UploadedImage[]) => void;
  onBusyChange?: (busy: boolean) => void;
  max?: number;
}

export default function PhotoPicker({ account, token, value, onChange, onBusyChange, max = 10 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingSlot[]>([]);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [overflowMessage, setOverflowMessage] = useState<string | null>(null);

  const totalCount = value.length + pending.length;
  const canAddMore = totalCount < max;

  useEffect(() => {
    onBusyChange?.(pending.some((p) => p.uploading) || removingId !== null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, removingId]);

  function handlePick() {
    inputRef.current?.click();
  }

  // Nhiều ảnh có thể upload đồng thời — mỗi ảnh xong phải tự cộng dồn vào state mới nhất
  // (functional updater), không được tính dựa trên `value` chụp tại thời điểm chọn ảnh,
  // nếu không các lần ghi đè lẫn nhau và chỉ còn 1 ảnh sống sót.
  async function runUpload(key: string, file: File) {
    try {
      const compressed = await compressForUpload(file);
      const uploaded = await uploadImage(compressed, account, token);
      setPending((prev) => {
        const slot = prev.find((p) => p.key === key);
        if (slot) URL.revokeObjectURL(slot.previewUrl);
        return prev.filter((p) => p.key !== key);
      });
      onChange((prev) => [...prev, uploaded]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload ảnh thất bại";
      setPending((prev) => prev.map((p) => (p.key === key ? { ...p, uploading: false, error: message } : p)));
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const room = max - totalCount;
    if (files.length > room) {
      setOverflowMessage(
        room > 0
          ? `Bạn chọn ${files.length} ảnh nhưng chỉ còn thêm được tối đa ${room} ảnh nữa (giới hạn ${max} ảnh/sự kiện). Vui lòng bỏ bớt ảnh đã chọn rồi thử lại.`
          : `Đã đạt giới hạn ${max} ảnh/sự kiện, không thể thêm ảnh mới.`
      );
      return;
    }
    setOverflowMessage(null);

    const newSlots: PendingSlot[] = files.map((file) => ({
      key: `${Date.now()}-${Math.random()}`,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
      error: null,
      file,
    }));
    setPending((prev) => [...prev, ...newSlots]);
    newSlots.forEach((slot) => runUpload(slot.key, slot.file));
  }

  function retrySlot(key: string) {
    const slot = pending.find((p) => p.key === key);
    if (!slot) return;
    setPending((prev) => prev.map((p) => (p.key === key ? { ...p, uploading: true, error: null } : p)));
    runUpload(key, slot.file);
  }

  function discardSlot(key: string) {
    setPending((prev) => {
      const slot = prev.find((p) => p.key === key);
      if (slot) URL.revokeObjectURL(slot.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
  }

  async function removeUploaded(img: UploadedImage) {
    setRemovingId(img.id);
    try {
      await deleteUpload(img.id, account, token);
      onChange((prev) => prev.filter((v) => v.id !== img.id));
    } catch (err) {
      setOverflowMessage(err instanceof Error ? err.message : "Xoá ảnh thất bại");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="photo-picker">
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFileChange} hidden />
      <div className="photo-grid">
        {value.map((img) => (
          <div className="photo-picker-preview" key={img.id}>
            <img src={img.thumb_url} alt="Ảnh đã tải lên" />
            <button
              type="button"
              className="photo-picker-remove"
              onClick={() => removeUploaded(img)}
              disabled={removingId === img.id}
              aria-label="Xoá ảnh"
            >
              ×
            </button>
          </div>
        ))}
        {pending.map((slot) => (
          <div className="photo-picker-preview" key={slot.key}>
            <img src={slot.previewUrl} alt="Đang tải lên" />
            {slot.uploading && <div className="photo-picker-overlay">Đang tải lên...</div>}
            {slot.error && (
              <div className="photo-picker-overlay photo-picker-overlay-error">
                <span>{slot.error}</span>
                <div className="photo-picker-slot-actions">
                  <button type="button" onClick={() => retrySlot(slot.key)}>
                    Thử lại
                  </button>
                  <button type="button" onClick={() => discardSlot(slot.key)}>
                    Bỏ
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {canAddMore && (
          <button type="button" className="photo-picker-add" onClick={handlePick}>
            📷 Thêm ảnh
          </button>
        )}
      </div>
      <div className="photo-grid-hint">{totalCount}/{max} ảnh</div>
      {overflowMessage && <div className="message error">{overflowMessage}</div>}
    </div>
  );
}
