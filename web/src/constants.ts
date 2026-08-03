import type { RecordType } from "./types";

// "custom" ("Tùy chọn") đã bị bỏ khỏi NOTE_TYPE_ORDER (không cho tạo mới nữa, thay bằng
// "sua_ra_dong") nhưng vẫn giữ meta ở đây để các bản ghi "custom" cũ đã lưu trước đây vẫn
// hiển thị đúng icon/nhãn trong Timeline/lịch sử — xoá hẳn sẽ làm crash phần render dữ liệu cũ.
export const ACTIVITY_META: Record<RecordType, { label: string; icon: string; accent: string }> = {
  hut_sua: { label: "Hút sữa", icon: "🍼", accent: "#2a78d6" },
  ti_me: { label: "Ti mẹ", icon: "🤱", accent: "#e0467a" },
  ti_binh: { label: "Ti bình", icon: "🍼", accent: "#ff8fb3" },
  non_tro: { label: "Nôn chớ", icon: "🤮", accent: "#eb6834" },
  di_nang: { label: "Đi nặng", icon: "💩", accent: "#1baf7a" },
  di_nhe: { label: "Đi nhẹ", icon: "💧", accent: "#79d6b3" },
  can_nang: { label: "Cân nặng", icon: "⚖️", accent: "#4a3aa7" },
  chieu_cao: { label: "Chiều cao", icon: "📏", accent: "#4a3aa7" },
  custom: { label: "Tùy chọn", icon: "➕", accent: "#4a3aa7" },
};

export type NoteTab = RecordType | "sua_ra_dong";

export const THAWED_MILK_META = { label: "Sữa Rã Đông", icon: "🧊", accent: "#2a9df4" };

export function getNoteTabMeta(tab: NoteTab): { label: string; icon: string; accent: string } {
  return tab === "sua_ra_dong" ? THAWED_MILK_META : ACTIVITY_META[tab];
}

export const NOTE_TYPE_ORDER: NoteTab[] = [
  "hut_sua",
  "ti_me",
  "ti_binh",
  "non_tro",
  "di_nang",
  "di_nhe",
  "can_nang",
  "chieu_cao",
  "sua_ra_dong",
];
