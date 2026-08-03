import { useEffect, useState } from "react";
import { fetchThawedMilk } from "../api";
import { elapsedFraction, formatDateTimeVN } from "../dateUtils";
import ThawedMilkEditModal from "./ThawedMilkEditModal";
import type { ThawedMilkEntry } from "../types";

const DOT_COUNT = 10;
// 3 điểm mốc xanh → vàng hổ phách → đỏ (không lerp thẳng xanh-đỏ trong không gian RGB, vì đường
// đó cắt ngang vùng nâu/olive xỉn màu ở giữa — không đọc được là "sắp hết hạn" một cách trực quan).
// Cùng tông xanh/đỏ đã dùng cho "bình thường"/"quá hạn" ở nơi khác trong app (#1baf7a, #c62828).
const GREEN: [number, number, number] = [27, 175, 122];
const AMBER: [number, number, number] = [245, 166, 35];
const RED: [number, number, number] = [198, 40, 40];

function lerp(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function dotColor(t: number): string {
  return t < 0.5 ? lerp(GREEN, AMBER, t / 0.5) : lerp(AMBER, RED, (t - 0.5) / 0.5);
}

function formatRemaining(frac: number, expiryAt: string): string {
  if (frac >= 1) return "Đã hết hạn";
  const msLeft = new Date(expiryAt).getTime() - Date.now();
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minutesLeft = Math.round((msLeft % 3600000) / 60000);
  if (hoursLeft > 0) return `Còn ${hoursLeft} giờ ${minutesLeft} phút`;
  return `Còn ${minutesLeft} phút`;
}

interface Props {
  account: string;
}

export default function ThawedMilkStatsSection({ account }: Props) {
  const [entries, setEntries] = useState<ThawedMilkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<ThawedMilkEntry | null>(null);

  function load() {
    setLoading(true);
    fetchThawedMilk(account)
      .then(setEntries)
      .finally(() => setLoading(false));
  }

  // Chỉ fetch 1 lần khi vào màn Thống Kê (không phụ thuộc ngày đang chọn ở view theo ngày) —
  // khớp yêu cầu "trạng thái tính toán lại mỗi lần vào view trang thống kê", không phải tick
  // sống theo thời gian thực.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  if (loading || entries.length === 0) return null;

  return (
    <section className="thawed-milk-section">
      <div className="thawed-milk-section-title">🧊 Sữa Rã Đông</div>
      <div className="thawed-milk-list">
        {entries.map((entry) => {
          const frac = elapsedFraction(entry.taken_out_at, entry.expiry_at);
          const filledCount = Math.round(frac * DOT_COUNT);
          return (
            <div
              className="thawed-milk-card"
              key={entry.id}
              onClick={() => setEditingEntry(entry)}
              role="button"
              tabIndex={0}
            >
              <div className="thawed-milk-card-row">
                <span className="thawed-milk-card-label">Lấy ra</span>
                <span>{formatDateTimeVN(entry.taken_out_at)}</span>
              </div>
              <div className="thawed-milk-card-row">
                <span className="thawed-milk-card-label">Hết hạn</span>
                <span>{formatDateTimeVN(entry.expiry_at)}</span>
              </div>
              <div className="thawed-milk-dots">
                {Array.from({ length: DOT_COUNT }).map((_, i) => {
                  const filled = i < filledCount;
                  const color = dotColor(i / (DOT_COUNT - 1));
                  return (
                    <span
                      key={i}
                      className={`thawed-milk-dot${filled ? " thawed-milk-dot-filled" : ""}`}
                      style={filled ? { background: color, boxShadow: `0 0 0 3px ${color}22` } : undefined}
                    />
                  );
                })}
              </div>
              <div className="thawed-milk-card-remaining">{formatRemaining(frac, entry.expiry_at)}</div>
            </div>
          );
        })}
      </div>

      {editingEntry && (
        <ThawedMilkEditModal
          key={editingEntry.id}
          entry={editingEntry}
          account={account}
          onClose={() => setEditingEntry(null)}
          onUpdated={() => {
            setEditingEntry(null);
            load();
          }}
          onDeleted={() => {
            setEditingEntry(null);
            load();
          }}
        />
      )}
    </section>
  );
}
