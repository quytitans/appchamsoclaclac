export type RecordType =
  | "hut_sua"
  | "ti_me"
  | "ti_binh"
  | "non_tro"
  | "di_nang"
  | "di_nhe"
  | "can_nang"
  | "chieu_cao"
  | "custom";

export type Side = "trai" | "phai" | "ca_hai";
export type DiNangStatus = "binh_thuong" | "co_van_de";
export type NonTroLevel = "nhe" | "trung_binh" | "nhieu" | "rat_nhieu";

export interface RecordItem {
  id: number;
  type: RecordType;
  date: string;
  time: string | null;
  side: string | null;
  volume_ml: number | null;
  status: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  custom_name: string | null;
  custom_value: string | null;
  note: string | null;
  created_at: string;
}

export interface CreateRecordPayload {
  type: RecordType;
  date: string;
  time?: string;
  side?: Side;
  volumeMl?: number;
  status?: string;
  weightKg?: number;
  heightCm?: number;
  customName?: string;
  customValue?: string;
  note?: string;
}

export interface StatsResponse {
  date: string;
  pumping: { count: number; totalMl: number; avgMl: number };
  breastfeed: { count: number };
  bottle: { count: number; totalMl: number; avgMl: number };
  poop: { count: number };
  pee: { count: number };
  feeding: { avgIntervalMinutes: number | null; avgMl: number };
  weight: {
    current: number | null;
    deltaWeek: number | null;
    deltaMonth: number | null;
  };
}
