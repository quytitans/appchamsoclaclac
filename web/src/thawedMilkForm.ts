import { addHoursToNaiveDateTime } from "./dateUtils";
import type { ThawedMilkEntry, ThawedMilkPayload } from "./types";

export interface ThawedMilkFormState {
  storageDate: string;
  takenOutDate: string;
  takenOutTime: string;
  expiryHours: string;
}

const DEFAULT_EXPIRY_HOURS = "30";

export function emptyThawedMilkFormState(date: string, time: string): ThawedMilkFormState {
  return { storageDate: "", takenOutDate: date, takenOutTime: time, expiryHours: DEFAULT_EXPIRY_HOURS };
}

export function thawedMilkToFormState(entry: ThawedMilkEntry): ThawedMilkFormState {
  const [takenOutDate, takenOutTime] = entry.taken_out_at.split("T");
  return {
    storageDate: entry.storage_date ?? "",
    takenOutDate,
    takenOutTime,
    expiryHours: String(entry.expiry_hours),
  };
}

export function buildThawedMilkPayload(state: ThawedMilkFormState, account: string): ThawedMilkPayload | null {
  if (!state.takenOutDate || !state.takenOutTime) return null;
  const hours = Number(state.expiryHours);
  if (!state.expiryHours || !Number.isFinite(hours) || hours <= 0) return null;
  return {
    account,
    storageDate: state.storageDate || null,
    takenOutAt: `${state.takenOutDate}T${state.takenOutTime}`,
    expiryHours: hours,
  };
}

export function computeExpiryPreview(state: ThawedMilkFormState): string | null {
  if (!state.takenOutDate || !state.takenOutTime) return null;
  const hours = Number(state.expiryHours);
  if (!state.expiryHours || !Number.isFinite(hours) || hours <= 0) return null;
  return addHoursToNaiveDateTime(`${state.takenOutDate}T${state.takenOutTime}`, hours);
}
