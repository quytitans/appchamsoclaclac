import type { GrowthRecord, GrowthRecordPayload } from "./types";

export interface GrowthFormState {
  date: string;
  milestoneLabel: string;
  heightCm: string;
  weightKg: string;
}

export function emptyGrowthFormState(date: string): GrowthFormState {
  return { date, milestoneLabel: "", heightCm: "", weightKg: "" };
}

export function growthRecordToFormState(record: GrowthRecord): GrowthFormState {
  return {
    date: record.date,
    milestoneLabel: record.milestone_label ?? "",
    heightCm: record.height_cm != null ? String(record.height_cm) : "",
    weightKg: record.weight_kg != null ? String(record.weight_kg) : "",
  };
}

export function buildGrowthPayload(state: GrowthFormState, account: string): GrowthRecordPayload | null {
  if (!state.date) return null;
  const heightCm = state.heightCm === "" ? undefined : Number(state.heightCm);
  const weightKg = state.weightKg === "" ? undefined : Number(state.weightKg);
  if (heightCm == null && weightKg == null) return null;
  if (heightCm != null && (!Number.isFinite(heightCm) || heightCm < 0)) return null;
  if (weightKg != null && (!Number.isFinite(weightKg) || weightKg < 0)) return null;
  return {
    account,
    date: state.date,
    milestoneLabel: state.milestoneLabel.trim() || undefined,
    heightCm,
    weightKg,
  };
}
