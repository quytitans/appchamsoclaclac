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

export interface RecordRow {
  id: number;
  type: RecordType;
  date: string;
  time: string | null;
  side: string | null;
  volume_ml: number | null;
  status: string | null;
  amount: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  custom_name: string | null;
  custom_value: string | null;
  note: string | null;
  created_at: string;
  account: string;
}

export interface CreateRecordBody {
  type: RecordType;
  date: string;
  time?: string;
  side?: Side;
  volumeMl?: number;
  status?: string;
  amount?: string;
  weightKg?: number;
  heightCm?: number;
  customName?: string;
  customValue?: string;
  note?: string;
  account?: string;
}

export interface AccountRow {
  id: string;
  baby_name: string;
  pin_hash: string;
  session_token: string;
  is_admin: number;
  is_active: number;
  created_at: string;
}

export type VaccineDurationType = "lifetime" | "limited" | "yearly";

export interface VaccineRow {
  id: number;
  account: string;
  disease_name: string;
  vaccine_name: string;
  total_doses: number | null;
  duration_type: VaccineDurationType;
  duration_years: number | null;
  expiry_month: number | null;
  expiry_year: number | null;
  next_dose_date: string | null;
  note: string | null;
  sort_order: number;
  created_at: string;
}

export interface VaccineDoseRow {
  id: number;
  vaccine_id: number;
  dose_number: number;
  location: string | null;
  date: string;
  note: string | null;
  created_at: string;
}

export interface DiaryEntryRow {
  id: number;
  account: string;
  entry_date: string;
  title: string;
  content: string;
  importance: string | null;
  created_at: string;
}
