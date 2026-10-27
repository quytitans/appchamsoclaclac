import type { VaccineProfileType } from "./types";

interface ProfileTypeMeta {
  icon: string;
  typeLabel: string;
  createLabel: string;
}

export const PROFILE_TYPE_META: Record<VaccineProfileType, ProfileTypeMeta> = {
  baby: { icon: "👶", typeLabel: "Em bé", createLabel: "Bé" },
  male: { icon: "👨", typeLabel: "Nam", createLabel: "Nam giới" },
  female: { icon: "👩", typeLabel: "Nữ", createLabel: "Nữ giới" },
  cat: { icon: "🐱", typeLabel: "Mèo", createLabel: "Mèo" },
  dog: { icon: "🐶", typeLabel: "Chó", createLabel: "Chó" },
};

export const PROFILE_TYPE_ORDER: VaccineProfileType[] = ["baby", "male", "female", "cat", "dog"];

export function profileIcon(type: VaccineProfileType): string {
  return PROFILE_TYPE_META[type]?.icon ?? "💉";
}

export function profileTypeLabel(type: VaccineProfileType): string {
  return PROFILE_TYPE_META[type]?.typeLabel ?? "";
}
