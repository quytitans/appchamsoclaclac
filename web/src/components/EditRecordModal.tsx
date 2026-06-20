import { useState } from "react";
import RecordFields from "./RecordFields";
import { deleteRecord, updateRecord } from "../api";
import { ACTIVITY_META } from "../constants";
import { buildRecordPayload, recordToFormState } from "../recordForm";
import type { RecordItem } from "../types";

interface Props {
  record: RecordItem;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function EditRecordModal({ record, onClose, onUpdated, onDeleted }: Props) {
  const [form, setForm] = useState(() => recordToFormState(record));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const payload = buildRecordPayload(record.type, form);
    if (!payload) {
      setMessage("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateRecord(record.id, payload);
      onUpdated();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Xóa bản ghi này? Hành động không thể hoàn tác.")) return;
    setDeleting(true);
    setMessage(null);
    try {
      await deleteRecord(record.id);
      onDeleted();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setDeleting(false);
    }
  }

  const meta = ACTIVITY_META[record.type];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            {meta.icon} {meta.label}
          </h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="note-form">
          <RecordFields type={record.type} state={form} onChange={handleChange} />
        </div>

        {message && <div className="message error">{message}</div>}

        <div className="modal-actions">
          <button className="delete-button" onClick={handleDelete} disabled={deleting || saving}>
            {deleting ? "Đang xóa..." : "Xóa"}
          </button>
          <button className="save-button" onClick={handleSave} disabled={saving || deleting}>
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
