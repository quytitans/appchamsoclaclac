import type { RecordType } from "./types";

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

export const NOTE_TYPE_ORDER: RecordType[] = [
  "hut_sua",
  "ti_me",
  "ti_binh",
  "non_tro",
  "di_nang",
  "di_nhe",
  "can_nang",
  "chieu_cao",
  "custom",
];
