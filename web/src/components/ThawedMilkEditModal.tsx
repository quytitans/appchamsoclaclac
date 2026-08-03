import { useState } from "react";
import ThawedMilkFields from "./ThawedMilkFields";
import { deleteThawedMilk, updateThawedMilk } from "../api";
import { buildThawedMilkPayload, thawedMilkToFormState } from "../thawedMilkForm";
import type { ThawedMilkEntry } from "../types";

interface Props {
  entry: ThawedMilkEntry;
  account: string;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function ThawedMilkEditModal({ entry, account, onClose, onUpdated, onDeleted }: Props) {
  const [form, setForm] = useState(() => thawedMilkToFormState(entry));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const payload = buildThawedMilkPayload(form, account);
    if (!payload) {
      setMessage("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateThawedMilk(entry.id, payload);
      onUpdated();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    setConfirmingDelete(false);
    setDeleting(true);
    setMessage(null);
    try {
      await deleteThawedMilk(entry.id, account);
      onDeleted();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🧊 Sữa Rã Đông</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="note-form">
          <ThawedMilkFields state={form} onChange={handleChange} />
        </div>

        {message && <div className="message error">{message}</div>}

        <div className="modal-actions">
          <button className="delete-button" onClick={() => setConfirmingDelete(true)} disabled={deleting || saving}>
            {deleting ? "Đang xóa..." : "Xóa"}
          </button>
          <button className="save-button" onClick={handleSave} disabled={saving || deleting}>
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <div
          className="confirm-dialog-overlay"
          onClick={(e) => {
            e.stopPropagation();
            setConfirmingDelete(false);
          }}
        >
          <div className="confirm-dialog-card" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-dialog-icon">🗑️</div>
            <div className="confirm-dialog-title">Xóa bản ghi này?</div>
            <div className="confirm-dialog-message">
              Sữa rã đông đã lưu sẽ bị xóa vĩnh viễn, không thể hoàn tác.
            </div>
            <div className="confirm-dialog-actions">
              <button
                className="secondary-button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
              >
                Hủy
              </button>
              <button className="delete-button" onClick={performDelete} disabled={deleting}>
                {deleting ? "Đang xóa..." : "Xóa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
