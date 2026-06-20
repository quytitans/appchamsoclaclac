import type { RecordItem } from "../types";

interface Props {
  records: RecordItem[];
  onSelectRecord: (record: RecordItem) => void;
}

interface Column {
  key: string;
  title: string;
  icon: string;
  items: RecordItem[];
  colorClass: string;
}

const SIDE_LABEL: Record<string, string> = { trai: "Trái", phai: "Phải", ca_hai: "Cả 2 bên" };
const DI_NANG_LABEL: Record<string, string> = { binh_thuong: "Bình thường", co_van_de: "Có vấn đề" };
const NON_TRO_LABEL: Record<string, string> = {
  nhe: "Nhẹ",
  trung_binh: "Trung bình",
  nhieu: "Nhiều",
  rat_nhieu: "Rất nhiều",
};

function byTime(a: RecordItem, b: RecordItem): number {
  return (a.time ?? "").localeCompare(b.time ?? "");
}

function buildColumns(records: RecordItem[]): Column[] {
  return [
    {
      key: "an",
      title: "Bé Ăn",
      icon: "🍽️",
      items: records.filter((r) => r.type === "ti_me" || r.type === "ti_binh").sort(byTime),
      colorClass: "",
    },
    {
      key: "hut_sua",
      title: "Hút sữa",
      icon: "🍼",
      items: records.filter((r) => r.type === "hut_sua"),
      colorClass: "card-hutsua",
    },
    {
      key: "ve_sinh",
      title: "Vệ sinh",
      icon: "🧷",
      items: records.filter((r) => r.type === "di_nang" || r.type === "di_nhe"),
      colorClass: "card-vesinh",
    },
    {
      key: "non_tro",
      title: "Nôn chớ",
      icon: "🤮",
      items: records.filter((r) => r.type === "non_tro"),
      colorClass: "card-nontro",
    },
    {
      key: "custom",
      title: "Tùy chọn",
      icon: "➕",
      items: records.filter((r) => r.type === "custom"),
      colorClass: "card-custom",
    },
  ];
}

function feedingShadeClass(record: RecordItem): string {
  if (record.type === "ti_me") return "feeding-me";
  if (record.type === "ti_binh") return "feeding-binh";
  return "";
}

function cardText(record: RecordItem): string {
  switch (record.type) {
    case "hut_sua":
      return `${SIDE_LABEL[record.side ?? ""] ?? ""} | ${record.volume_ml}ml`;
    case "ti_me":
      return `Ti mẹ | ${SIDE_LABEL[record.side ?? ""] ?? ""}`;
    case "ti_binh":
      return `Ti bình | ${record.volume_ml}ml`;
    case "non_tro":
      return `Nôn chớ | ${NON_TRO_LABEL[record.status ?? ""] ?? ""}`;
    case "di_nang":
      return `Đi nặng | ${DI_NANG_LABEL[record.status ?? ""] ?? ""}`;
    case "di_nhe":
      return "Đi nhẹ";
    case "can_nang":
      return `Cân nặng | ${record.weight_kg}kg`;
    case "chieu_cao":
      return `Chiều cao | ${record.height_cm}cm`;
    case "custom":
      return [record.custom_name, record.custom_value, record.note].filter(Boolean).join(" | ");
  }
}

export default function TimelineGrid({ records, onSelectRecord }: Props) {
  const columns = buildColumns(records);

  return (
    <section className="timeline-grid">
      {columns.map((col) => (
        <div key={col.key} className="timeline-column">
          <div className="timeline-column-header">
            <span>{col.icon}</span>
            <span>{col.title}</span>
          </div>
          <div className="timeline-column-body">
            {col.items.length === 0 && <p className="timeline-empty">—</p>}
            {col.items.map((item) => (
              <button
                key={item.id}
                className={`timeline-card ${col.colorClass} ${feedingShadeClass(item)}`}
                onClick={() => onSelectRecord(item)}
              >
                <span className="timeline-card-time">{item.time ?? ""}</span>
                <div className="timeline-card-detail">{cardText(item)}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
