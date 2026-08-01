import type { RecordItem } from "../types";

interface Props {
  records: RecordItem[];
  onSelectRecord: (record: RecordItem) => void;
}

interface Group {
  key: string;
  title: string;
  icon: string;
  items: RecordItem[];
  colorClass: string;
}

interface Column {
  key: string;
  title: string;
  icon: string;
  colorClass: string;
  items?: RecordItem[];
  groups?: Group[];
}

const SIDE_LABEL: Record<string, string> = { trai: "Trái", phai: "Phải", ca_hai: "2 bên" };
const DI_NANG_LABEL: Record<string, string> = { binh_thuong: "BT", co_van_de: "Có vấn đề" };
const NON_TRO_LABEL: Record<string, string> = {
  nhe: "Nhẹ",
  trung_binh: "TB",
  nhieu: "Nhiều",
  rat_nhieu: "Rất nhiều",
};
const TI_ME_AMOUNT_LABEL: Record<string, string> = { it: "Ít", trung_binh: "TB", nhieu: "Nhiều" };
const DI_NANG_AMOUNT_LABEL: Record<string, string> = { it: "Ít", nhieu: "Nhiều" };

function byTime(a: RecordItem, b: RecordItem): number {
  return (a.time ?? "").localeCompare(b.time ?? "");
}

const COVERED_TYPES = new Set(["ti_me", "ti_binh", "hut_sua", "di_nang", "di_nhe", "non_tro"]);

function buildColumns(records: RecordItem[]): Column[] {
  return [
    {
      key: "an",
      title: "Bé Ăn",
      icon: "🍽️",
      colorClass: "group-an",
      items: records.filter((r) => r.type === "ti_me" || r.type === "ti_binh").sort(byTime),
    },
    {
      key: "hut_sua_group",
      title: "",
      icon: "",
      colorClass: "",
      groups: [
        {
          key: "hut_sua",
          title: "Hút sữa",
          icon: "🍼",
          colorClass: "group-hutsua",
          items: records.filter((r) => r.type === "hut_sua"),
        },
        {
          key: "ve_sinh",
          title: "Vệ sinh",
          icon: "🧷",
          colorClass: "group-vesinh",
          items: records.filter((r) => r.type === "di_nang" || r.type === "di_nhe"),
        },
        {
          key: "non_tro",
          title: "Nôn chớ",
          icon: "🤮",
          colorClass: "group-nontro",
          items: records.filter((r) => r.type === "non_tro"),
        },
        {
          key: "khac",
          title: "Các vấn đề khác",
          icon: "📌",
          colorClass: "group-khac",
          items: records.filter((r) => !COVERED_TYPES.has(r.type)),
        },
      ],
    },
  ];
}

function shadeClass(record: RecordItem): string {
  if (record.type === "ti_me") {
    if (record.side === "trai") return "feeding-me feeding-me-trai";
    if (record.side === "phai") return "feeding-me feeding-me-phai";
    if (record.side === "ca_hai") return "feeding-me feeding-me-cahai";
    return "feeding-me";
  }
  if (record.type === "ti_binh") return "feeding-binh";
  if (record.type === "hut_sua") {
    if (record.side === "trai") return "hutsua-trai";
    if (record.side === "phai") return "hutsua-phai";
    if (record.side === "ca_hai") return "hutsua-cahai";
    return "";
  }
  if (record.type === "di_nang") return "vesinh-nang";
  if (record.type === "di_nhe") return "vesinh-nhe";
  return "";
}

function cardText(record: RecordItem): string {
  switch (record.type) {
    case "hut_sua":
      return `${SIDE_LABEL[record.side ?? ""] ?? ""} | ${record.volume_ml}ml`;
    case "ti_me": {
      const parts = [SIDE_LABEL[record.side ?? ""] ?? ""];
      if (record.amount) parts.push(TI_ME_AMOUNT_LABEL[record.amount] ?? record.amount);
      return `Ti mẹ | ${parts.join(" | ")}`;
    }
    case "ti_binh":
      return `Ti bình | ${record.volume_ml}ml`;
    case "non_tro":
      return `Nôn chớ | ${NON_TRO_LABEL[record.status ?? ""] ?? ""}`;
    case "di_nang": {
      const parts = [DI_NANG_LABEL[record.status ?? ""] ?? ""];
      if (record.amount) parts.push(DI_NANG_AMOUNT_LABEL[record.amount] ?? record.amount);
      return `Đi nặng | ${parts.join(" | ")}`;
    }
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

function ColumnHeader({ icon, title, count }: { icon: string; title: string; count: number }) {
  return (
    <div className="timeline-column-header">
      <span className="timeline-column-header-icon">{icon}</span>
      <span className="timeline-column-header-title">{title}</span>
      <span className="timeline-column-header-count">{count}</span>
    </div>
  );
}

function CardList({
  items,
  colorClass,
  onSelectRecord,
}: {
  items: RecordItem[];
  colorClass: string;
  onSelectRecord: (record: RecordItem) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="timeline-column-body">
        <div className={`timeline-item ${colorClass}`}>
          <span className="timeline-dot timeline-dot-empty" />
          <div className="timeline-card timeline-card-empty">—</div>
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-column-body">
      {items.map((item) => (
        <div key={item.id} className={`timeline-item ${colorClass} ${shadeClass(item)}`}>
          <span className="timeline-dot" />
          <button className="timeline-card" onClick={() => onSelectRecord(item)}>
            <span className="timeline-card-time">{item.time ?? ""}</span>
            <div className="timeline-card-detail">{cardText(item)}</div>
          </button>
        </div>
      ))}
    </div>
  );
}

export default function TimelineGrid({ records, onSelectRecord }: Props) {
  const columns = buildColumns(records);

  return (
    <section className="timeline-grid">
      {columns.map((col) => (
        <div key={col.key} className="timeline-column">
          {col.groups ? (
            col.groups.map((group) => (
              <div key={group.key} className={`timeline-subgroup ${group.colorClass}`}>
                <ColumnHeader icon={group.icon} title={group.title} count={group.items.length} />
                <CardList items={group.items} colorClass={group.colorClass} onSelectRecord={onSelectRecord} />
              </div>
            ))
          ) : (
            <div className={col.colorClass}>
              <ColumnHeader icon={col.icon} title={col.title} count={(col.items ?? []).length} />
              <CardList items={col.items ?? []} colorClass={col.colorClass} onSelectRecord={onSelectRecord} />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
