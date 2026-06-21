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
  account: string;
}

export interface Session {
  token: string;
  account: string;
  babyName: string;
  isAdmin: boolean;
}

export interface AccountSummary {
  account: string;
  babyName: string;
  isAdmin: boolean;
  isActive: boolean;
  createdAt: string;
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

export interface MonthDayStats {
  date: string;
  feedCount: number;
  bottleMl: number;
  bottleAvgMl: number;
  weightKg: number | null;
  heightCm: number | null;
}

export interface WeeklyGrowth {
  label: string;
  deltaKg: number | null;
}

export interface MonthStatsResponse {
  month: string;
  days: MonthDayStats[];
  weeklyGrowth: WeeklyGrowth[];
  monthlyGrowthKg: number | null;
}

export interface LatestGrowth {
  weightKg: number | null;
  heightCm: number | null;
}

export type VaccineDurationType = "lifetime" | "limited" | "yearly";

export interface VaccineDose {
  id: number;
  vaccine_id: number;
  dose_number: number;
  location: string | null;
  date: string;
  note: string | null;
  created_at: string;
}

export interface VaccineSummary {
  id: number;
  account: string;
  disease_name: string;
  vaccine_name: string;
  total_doses: number | null;
  duration_type: VaccineDurationType;
  expiry_month: number | null;
  expiry_year: number | null;
  next_dose_date: string | null;
  sort_order: number;
  created_at: string;
  doseCount: number;
  latestDose: VaccineDose | null;
}

export interface VaccineDetail extends Omit<VaccineSummary, "doseCount" | "latestDose"> {
  doses: VaccineDose[];
}

export interface VaccinePayload {
  account: string;
  diseaseName: string;
  vaccineName: string;
  totalDoses?: number;
  durationType: VaccineDurationType;
  expiryMonth?: number;
  expiryYear?: number;
  nextDoseDate?: string;
}

export interface DosePayload {
  account: string;
  doseNumber: number;
  location?: string;
  date: string;
  note?: string;
}
