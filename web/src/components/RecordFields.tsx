import type { ChangeEvent, ReactNode } from "react";
import ToggleGroup from "./ToggleGroup";
import type { RecordFormState } from "../recordForm";
import type { RecordType } from "../types";

const SIDE_OPTIONS = [
  { value: "trai", label: "Bên Trái" },
  { value: "phai", label: "Bên Phải" },
  { value: "ca_hai", label: "Cả 2 bên" },
];

const DI_NANG_OPTIONS = [
  { value: "binh_thuong", label: "Bình thường" },
  { value: "co_van_de", label: "Có vấn đề" },
];

const NON_TRO_OPTIONS = [
  { value: "nhe", label: "Nhẹ" },
  { value: "trung_binh", label: "Trung bình" },
  { value: "nhieu", label: "Nhiều" },
  { value: "rat_nhieu", label: "Rất nhiều" },
];

interface Props {
  type: RecordType;
  state: RecordFormState;
  onChange: <K extends keyof RecordFormState>(key: K, value: RecordFormState[K]) => void;
}

function onNonNegativeChange(
  key: "volumeMl" | "weightKg" | "heightCm",
  onChange: Props["onChange"]
) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value !== "" && Number(value) < 0) return;
    onChange(key, value);
  };
}

export default function RecordFields({ type, state, onChange }: Props) {
  switch (type) {
    case "hut_sua":
      return (
        <>
          <DateTimeRow date={state.date} time={state.time} timeLabel="Giờ hút" onChange={onChange} />
          <Field label="Vị trí">
            <ToggleGroup options={SIDE_OPTIONS} value={state.side} onChange={(v) => onChange("side", v)} />
          </Field>
          <Field label="Dung tích (ml)">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="VD: 80"
              value={state.volumeMl}
              onChange={onNonNegativeChange("volumeMl", onChange)}
            />
          </Field>
        </>
      );

    case "ti_me":
      return (
        <>
          <DateTimeRow date={state.date} time={state.time} timeLabel="Giờ ti mẹ" onChange={onChange} />
          <Field label="Vị trí">
            <ToggleGroup options={SIDE_OPTIONS} value={state.side} onChange={(v) => onChange("side", v)} />
          </Field>
        </>
      );

    case "ti_binh":
      return (
        <>
          <DateTimeRow date={state.date} time={state.time} timeLabel="Giờ ti bình" onChange={onChange} />
          <Field label="Dung tích (ml)">
            <input
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="VD: 120"
              value={state.volumeMl}
              onChange={onNonNegativeChange("volumeMl", onChange)}
            />
          </Field>
        </>
      );

    case "non_tro":
      return (
        <>
          <DateTimeRow date={state.date} time={state.time} timeLabel="Giờ nôn chớ" onChange={onChange} />
          <Field label="Mức độ">
            <ToggleGroup options={NON_TRO_OPTIONS} value={state.status} onChange={(v) => onChange("status", v)} />
          </Field>
        </>
      );

    case "di_nang":
      return (
        <>
          <DateTimeRow date={state.date} time={state.time} timeLabel="Giờ đi nặng" onChange={onChange} />
          <Field label="Trạng thái">
            <ToggleGroup options={DI_NANG_OPTIONS} value={state.status} onChange={(v) => onChange("status", v)} />
          </Field>
        </>
      );

    case "di_nhe":
      return <DateTimeRow date={state.date} time={state.time} timeLabel="Giờ đi nhẹ" onChange={onChange} />;

    case "can_nang":
      return (
        <>
          <Field label="Ngày cân">
            <input type="date" value={state.date} onChange={(e) => onChange("date", e.target.value)} />
          </Field>
          <Field label="Khối lượng (kg)">
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              placeholder="VD: 6.5"
              value={state.weightKg}
              onChange={onNonNegativeChange("weightKg", onChange)}
            />
          </Field>
        </>
      );

    case "chieu_cao":
      return (
        <>
          <Field label="Ngày đo">
            <input type="date" value={state.date} onChange={(e) => onChange("date", e.target.value)} />
          </Field>
          <Field label="Kích thước (cm)">
            <input
              type="number"
              min={0}
              step="0.1"
              inputMode="decimal"
              placeholder="VD: 60"
              value={state.heightCm}
              onChange={onNonNegativeChange("heightCm", onChange)}
            />
          </Field>
        </>
      );

    case "custom":
      return (
        <>
          <DateTimeRow date={state.date} time={state.time} timeLabel="Giờ" onChange={onChange} />
          <Field label="Tên hoạt động">
            <input
              type="text"
              placeholder="VD: Uống vitamin D"
              value={state.customName}
              onChange={(e) => onChange("customName", e.target.value)}
            />
          </Field>
          <Field label="Giá trị">
            <input
              type="text"
              placeholder="VD: 1 giọt"
              value={state.customValue}
              onChange={(e) => onChange("customValue", e.target.value)}
            />
          </Field>
          <Field label="Trạng thái">
            <input
              type="text"
              placeholder="VD: Bình thường"
              value={state.customStatus}
              onChange={(e) => onChange("customStatus", e.target.value)}
            />
          </Field>
          <Field label="Ghi chú">
            <textarea value={state.note} onChange={(e) => onChange("note", e.target.value)} rows={3} />
          </Field>
        </>
      );
  }
}

function DateTimeRow({
  date,
  time,
  timeLabel,
  onChange,
}: {
  date: string;
  time: string;
  timeLabel: string;
  onChange: Props["onChange"];
}) {
  return (
    <div className="field-row">
      <Field label="Ngày">
        <input type="date" value={date} onChange={(e) => onChange("date", e.target.value)} />
      </Field>
      <Field label={timeLabel}>
        <input type="time" value={time} onChange={(e) => onChange("time", e.target.value)} />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}
