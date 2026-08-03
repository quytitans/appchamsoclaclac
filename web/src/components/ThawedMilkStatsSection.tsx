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

function formatRemaining(expiryAt: string): string {
  const msLeft = new Date(expiryAt).getTime() - Date.now();
  const hoursLeft = Math.floor(msLeft / 3600000);
  const minutesLeft = Math.round((msLeft % 3600000) / 60000);
  if (hoursLeft > 0) return `Còn ${hoursLeft} giờ ${minutesLeft} phút`;
  return `Còn ${minutesLeft} phút`;
}

// Ảnh hưởng của việc ẩn: hết hạn xong vẫn hiện thêm 12h kèm banner đỏ cảnh báo, sau đó tự ẩn
// khỏi danh sách (không xoá dữ liệu, chỉ không hiển thị nữa).
const HIDE_AFTER_EXPIRY_MS = 12 * 3600000;

// Giá trị "đã hết hạn/còn bao lâu bị ẩn" được tính lại mỗi TICK_MS bằng Date.now() tại thời
// điểm render — không lưu vào state, không phụ thuộc dữ liệu fetch — nên nếu màn Thống Kê bị
// để mở nhiều giờ, các chỉ số này vẫn tự cập nhật đúng mà KHÔNG cần gọi lại API mỗi lần (tránh
// tốn băng thông), đồng thời không bao giờ bị "đơ" ở giá trị cũ do cache dữ liệu.
const TICK_MS = 60000;

interface Props {
  account: string;
}

export default function ThawedMilkStatsSection({ account }: Props) {
  const [entries, setEntries] = useState<ThawedMilkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<ThawedMilkEntry | null>(null);
  const [, setTick] = useState(0);

  function load() {
    setLoading(true);
    fetchThawedMilk(account)
      .then(setEntries)
      .finally(() => setLoading(false));
  }

  // Chỉ fetch dữ liệu 1 lần khi vào màn Thống Kê (không phụ thuộc ngày đang chọn ở view theo
  // ngày) — data (danh sách bản ghi) hiếm khi đổi trong lúc đang xem, không cần gọi lại API.
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  // Riêng phần "đã hết hạn chưa / còn bao lâu bị ẩn" phải tự làm mới định kỳ bằng đồng hồ cục bộ
  // (không qua network) — nếu chỉ tính 1 lần lúc fetch, người dùng để tab mở qua lúc sữa hết hạn
  // hoặc qua mốc ẩn sau 12h sẽ thấy thông tin sai cho đến khi rời màn hình rồi quay lại.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (loading) return null;

  const now = Date.now();
  const visibleEntries = entries.filter(
    (entry) => now < new Date(entry.expiry_at).getTime() + HIDE_AFTER_EXPIRY_MS
  );

  if (visibleEntries.length === 0) return null;

  return (
    <section className="thawed-milk-section">
      <div className="thawed-milk-section-title">🧊 Sữa Rã Đông</div>
      <div className="thawed-milk-list">
        {visibleEntries.map((entry) => {
          const frac = elapsedFraction(entry.taken_out_at, entry.expiry_at);
          const filledCount = Math.round(frac * DOT_COUNT);
          const isExpired = now >= new Date(entry.expiry_at).getTime();
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
              {isExpired ? (
                <div className="thawed-milk-card-expired-banner">
                  ⚠️ Sữa đã hết hạn — dữ liệu sẽ bị ẩn sau 12h
                </div>
              ) : (
                <div className="thawed-milk-card-remaining">{formatRemaining(entry.expiry_at)}</div>
              )}
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
