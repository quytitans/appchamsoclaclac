import { useState } from "react";
import GrowthFields from "./GrowthFields";
import { deleteGrowthRecord, updateGrowthRecord } from "../api";
import { buildGrowthPayload, growthRecordToFormState } from "../growthForm";
import type { GrowthRecord } from "../types";

interface Props {
  record: GrowthRecord;
  account: string;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

export default function GrowthEditModal({ record, account, onClose, onUpdated, onDeleted }: Props) {
  const [form, setForm] = useState(() => growthRecordToFormState(record));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    const payload = buildGrowthPayload(form, account);
    if (!payload) {
      setMessage("Vui lòng nhập ngày và ít nhất chiều cao hoặc cân nặng");
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await updateGrowthRecord(record.id, payload);
      onUpdated();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Đã có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Xóa bản ghi đo này? Hành động không thể hoàn tác.")) return;
    setDeleting(true);
    setMessage(null);
    try {
      await deleteGrowthRecord(record.id, account);
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
          <h3>📏 Sửa Số Đo</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="note-form">
          <GrowthFields state={form} onChange={handleChange} />
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
