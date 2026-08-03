import { useEffect, useRef, useState } from "react";
import { uploadImage, deleteUpload } from "../api";
import { compressForUpload } from "../imageCompress";
import type { UploadedImage } from "../types";

// iOS Safari has a much tighter per-tab memory ceiling than desktop/Android Chrome —
// decoding+encoding several full-res iPhone photos at once (createImageBitmap + canvas)
// can exhaust it and silently fail. Cap concurrent uploads so at most a few photos are
// being compressed/uploaded at any moment, regardless of how many were selected at once.
const MAX_CONCURRENT_UPLOADS = 3;

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

export default function PhotoPicker({ account, token, value, onChange, onBusyChange, max = 24 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingSlot[]>([]);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());
  const [overflowMessage, setOverflowMessage] = useState<string | null>(null);
  // Tracks the current upload "batch" for the dot progress indicator — separate from
  // `pending` because completed slots leave `pending` (merged into `value`), so we'd
  // otherwise lose the count of how many finished once they're done.
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchDone, setBatchDone] = useState(0);

  const fileByKeyRef = useRef<Map<string, File>>(new Map());
  const uploadQueueRef = useRef<string[]>([]);
  const activeUploadsRef = useRef(0);
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
  const cancelledKeysRef = useRef<Set<string>>(new Set());

  const removeQueueRef = useRef<UploadedImage[]>([]);
  const removingActiveRef = useRef(false);

  const totalCount = value.length + pending.length;
  const canAddMore = totalCount < max;
  const uploadingSlots = pending.filter((p) => p.uploading);

  useEffect(() => {
    onBusyChange?.(pending.some((p) => p.uploading) || removingIds.size > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending, removingIds]);

  function handlePick() {
    inputRef.current?.click();
  }

  // Nhiều ảnh có thể upload đồng thời — mỗi ảnh xong phải tự cộng dồn vào state mới nhất
  // (functional updater), không được tính dựa trên `value` chụp tại thời điểm chọn ảnh,
  // nếu không các lần ghi đè lẫn nhau và chỉ còn 1 ảnh sống sót.
  async function runUpload(key: string, file: File) {
    const controller = new AbortController();
    abortControllersRef.current.set(key, controller);
    try {
      const compressed = await compressForUpload(file);
      if (cancelledKeysRef.current.has(key)) return;
      const uploaded = await uploadImage(compressed, account, token, controller.signal);
      if (cancelledKeysRef.current.has(key)) {
        // User cancelled right as the upload finished — the file already landed on
        // Drive/DB, so clean it up instead of leaving an orphan the user never asked for.
        deleteUpload(uploaded.id, account, token).catch(() => {});
        return;
      }
      setPending((prev) => {
        const slot = prev.find((p) => p.key === key);
        if (slot) URL.revokeObjectURL(slot.previewUrl);
        return prev.filter((p) => p.key !== key);
      });
      setBatchDone((d) => d + 1);
      onChange((prev) => [...prev, uploaded]);
    } catch (err) {
      if (cancelledKeysRef.current.has(key)) return;
      const message = err instanceof Error ? err.message : "Upload ảnh thất bại";
      setPending((prev) => prev.map((p) => (p.key === key ? { ...p, uploading: false, error: message } : p)));
    } finally {
      abortControllersRef.current.delete(key);
      cancelledKeysRef.current.delete(key);
    }
  }

  // Only ever runs MAX_CONCURRENT_UPLOADS uploads at once; the rest wait in
  // uploadQueueRef until a slot frees up (see enqueueUpload below).
  function pumpQueue() {
    while (activeUploadsRef.current < MAX_CONCURRENT_UPLOADS && uploadQueueRef.current.length > 0) {
      const key = uploadQueueRef.current.shift()!;
      const file = fileByKeyRef.current.get(key);
      if (!file) continue;
      activeUploadsRef.current += 1;
      runUpload(key, file).finally(() => {
        activeUploadsRef.current -= 1;
        pumpQueue();
      });
    }
  }

  function enqueueUpload(key: string, file: File) {
    fileByKeyRef.current.set(key, file);
    uploadQueueRef.current.push(key);
    pumpQueue();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const room = max - totalCount;
    if (room <= 0) {
      setOverflowMessage(`Đã đạt giới hạn ${max} ảnh/sự kiện, không thể thêm ảnh mới.`);
      return;
    }

    // Giữ lại đúng thứ tự người dùng chọn — chỉ nhận đủ ảnh còn chỗ trống, phần dư bị bỏ qua
    // (không chặn cả lượt chọn) và báo rõ đã bỏ bao nhiêu ảnh.
    const filesToAdd = files.slice(0, room);
    const skippedCount = files.length - filesToAdd.length;
    setOverflowMessage(
      skippedCount > 0
        ? `Chỉ được tải tối đa ${max} ảnh cho 1 sự kiện. Đã tải ${filesToAdd.length} ảnh đầu tiên, bỏ qua ${skippedCount} ảnh còn lại.`
        : null
    );

    const newSlots: PendingSlot[] = filesToAdd.map((file) => ({
      key: `${Date.now()}-${Math.random()}`,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
      error: null,
      file,
    }));
    setPending((prev) => [...prev, ...newSlots]);
    // Starting fresh (nothing currently uploading) resets the dot progress to this new
    // batch; adding more photos mid-upload just extends the current batch's total.
    if (uploadingSlots.length === 0) {
      setBatchDone(0);
      setBatchTotal(newSlots.length);
    } else {
      setBatchTotal((t) => t + newSlots.length);
    }
    newSlots.forEach((slot) => enqueueUpload(slot.key, slot.file));
  }

  function retrySlot(key: string) {
    const slot = pending.find((p) => p.key === key);
    if (!slot) return;
    setPending((prev) => prev.map((p) => (p.key === key ? { ...p, uploading: true, error: null } : p)));
    enqueueUpload(key, slot.file);
  }

  function discardSlot(key: string) {
    uploadQueueRef.current = uploadQueueRef.current.filter((k) => k !== key);
    fileByKeyRef.current.delete(key);
    setPending((prev) => {
      const slot = prev.find((p) => p.key === key);
      if (slot) URL.revokeObjectURL(slot.previewUrl);
      return prev.filter((p) => p.key !== key);
    });
    setBatchTotal((t) => Math.max(0, t - 1));
  }

  // Cancels every slot still queued or actively uploading (leaves already-failed slots
  // alone so the user can still retry/dismiss those individually).
  function cancelAllUploads() {
    const keysToCancel = pending.filter((p) => p.uploading).map((p) => p.key);
    if (keysToCancel.length === 0) return;

    keysToCancel.forEach((key) => {
      cancelledKeysRef.current.add(key);
      abortControllersRef.current.get(key)?.abort();
      abortControllersRef.current.delete(key);
      fileByKeyRef.current.delete(key);
    });
    uploadQueueRef.current = uploadQueueRef.current.filter((k) => !keysToCancel.includes(k));

    setPending((prev) => {
      prev.filter((p) => keysToCancel.includes(p.key)).forEach((p) => URL.revokeObjectURL(p.previewUrl));
      return prev.filter((p) => !keysToCancel.includes(p.key));
    });
    setBatchTotal(0);
    setBatchDone(0);
  }

  // Xoá luôn xử lý tuần tự (tối đa 1 request DELETE cùng lúc) dù người dùng bấm X liên
  // tiếp nhiều ảnh — mỗi lần bấm chỉ ghi nhận vào hàng đợi và hiện overlay "Đang xoá..."
  // ngay lập tức, ảnh chỉ thực sự biến mất khi request của nó tới lượt và hoàn tất.
  async function performRemove(img: UploadedImage) {
    try {
      await deleteUpload(img.id, account, token);
      onChange((prev) => prev.filter((v) => v.id !== img.id));
    } catch (err) {
      setOverflowMessage(err instanceof Error ? err.message : "Xoá ảnh thất bại");
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(img.id);
        return next;
      });
    }
  }

  function pumpRemoveQueue() {
    if (removingActiveRef.current) return;
    const next = removeQueueRef.current.shift();
    if (!next) return;
    removingActiveRef.current = true;
    performRemove(next).finally(() => {
      removingActiveRef.current = false;
      pumpRemoveQueue();
    });
  }

  function removeUploaded(img: UploadedImage) {
    if (removingIds.has(img.id)) return;
    setRemovingIds((prev) => new Set(prev).add(img.id));
    removeQueueRef.current.push(img);
    pumpRemoveQueue();
  }

  return (
    <div className="photo-picker">
      {uploadingSlots.length > 0 && (
        <div className="photo-upload-global-overlay">
          <div className="photo-upload-global-card">
            <div className="photo-upload-spinner" aria-hidden="true" />
            <div className="photo-upload-global-title">Đang tải ảnh lên</div>
            <div
              className="photo-upload-dots"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={batchTotal}
              aria-valuenow={batchDone}
              aria-label={`Đã tải ${batchDone} trên ${batchTotal} ảnh`}
            >
              {Array.from({ length: batchTotal }).map((_, i) => (
                <span
                  key={i}
                  className={`photo-upload-dot${i < batchDone ? " photo-upload-dot-done" : ""}`}
                />
              ))}
            </div>
            <div className="photo-upload-global-subtitle">Vui lòng chờ trước khi lưu</div>
            <button type="button" className="photo-upload-global-cancel" onClick={cancelAllUploads}>
              Hủy tải ảnh
            </button>
          </div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFileChange} hidden />
      <div className="photo-grid">
        {value.map((img) => (
          <div className="photo-picker-preview" key={img.id}>
            <img src={img.thumb_url} alt="Ảnh đã tải lên" />
            {removingIds.has(img.id) ? (
              <div className="photo-picker-overlay">Đang xoá...</div>
            ) : (
              <button
                type="button"
                className="photo-picker-remove"
                onClick={() => removeUploaded(img)}
                aria-label="Xoá ảnh"
              >
                ×
              </button>
            )}
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
