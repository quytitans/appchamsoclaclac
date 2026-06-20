export type RecordType =
  | "hut_sua"
  | "ti_me"
  | "ti_binh"
  | "di_nang"
  | "di_nhe"
  | "can_nang"
  | "chieu_cao"
  | "custom";

export type Side = "trai" | "phai";
export type DiNangStatus = "binh_thuong" | "co_van_de";

export interface RecordRow {
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

export interface CreateRecordBody {
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
