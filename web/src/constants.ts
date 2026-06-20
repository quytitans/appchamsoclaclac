import type { RecordType } from "./types";

export const ACTIVITY_META: Record<RecordType, { label: string; icon: string }> = {
  hut_sua: { label: "Hút sữa", icon: "🍼" },
  ti_me: { label: "Ti mẹ", icon: "🤱" },
  ti_binh: { label: "Ti bình", icon: "🍼" },
  di_nang: { label: "Đi nặng", icon: "💩" },
  di_nhe: { label: "Đi nhẹ", icon: "💧" },
  can_nang: { label: "Cân nặng", icon: "⚖️" },
  chieu_cao: { label: "Chiều cao", icon: "📏" },
  custom: { label: "Tùy chọn", icon: "➕" },
};

export const NOTE_TYPE_ORDER: RecordType[] = [
  "hut_sua",
  "ti_me",
  "ti_binh",
  "di_nang",
  "di_nhe",
  "can_nang",
  "chieu_cao",
  "custom",
];
