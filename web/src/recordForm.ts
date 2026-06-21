import type { CreateRecordPayload, RecordItem, RecordType, Side } from "./types";

export interface RecordFormState {
  date: string;
  time: string;
  side?: string;
  volumeMl: string;
  status?: string;
  weightKg: string;
  heightCm: string;
  customName: string;
  customValue: string;
  customStatus: string;
  note: string;
}

export function emptyRecordFormState(date: string, time: string): RecordFormState {
  return {
    date,
    time,
    side: undefined,
    volumeMl: "",
    status: undefined,
    weightKg: "",
    heightCm: "",
    customName: "",
    customValue: "",
    customStatus: "",
    note: "",
  };
}

export function recordToFormState(record: RecordItem): RecordFormState {
  return {
    date: record.date,
    time: record.time ?? "",
    side: record.side ?? undefined,
    volumeMl: record.volume_ml != null ? String(record.volume_ml) : "",
    status:
      record.type === "di_nang" || record.type === "non_tro" ? record.status ?? undefined : undefined,
    weightKg: record.weight_kg != null ? String(record.weight_kg) : "",
    heightCm: record.height_cm != null ? String(record.height_cm) : "",
    customName: record.custom_name ?? "",
    customValue: record.custom_value ?? "",
    customStatus: record.type === "custom" ? record.status ?? "" : "",
    note: record.note ?? "",
  };
}

export function buildRecordPayload(
  type: RecordType,
  state: RecordFormState
): Omit<CreateRecordPayload, "account"> | null {
  const base = { type, date: state.date };
  switch (type) {
    case "hut_sua":
      if (!state.side || !state.volumeMl) return null;
      return { ...base, time: state.time, side: state.side as Side, volumeMl: Number(state.volumeMl) };
    case "ti_me":
      if (!state.side) return null;
      return { ...base, time: state.time, side: state.side as Side };
    case "ti_binh":
      if (!state.volumeMl) return null;
      return { ...base, time: state.time, volumeMl: Number(state.volumeMl) };
    case "non_tro":
      if (!state.status) return null;
      return { ...base, time: state.time, status: state.status };
    case "di_nang":
      if (!state.status) return null;
      return { ...base, time: state.time, status: state.status };
    case "di_nhe":
      return { ...base, time: state.time };
    case "can_nang":
      if (!state.weightKg) return null;
      return { ...base, weightKg: Number(state.weightKg) };
    case "chieu_cao":
      if (!state.heightCm) return null;
      return { ...base, heightCm: Number(state.heightCm) };
    case "custom":
      if (!state.customName) return null;
      return {
        ...base,
        time: state.time,
        customName: state.customName,
        customValue: state.customValue || undefined,
        status: state.customStatus || undefined,
        note: state.note || undefined,
      };
  }
}
