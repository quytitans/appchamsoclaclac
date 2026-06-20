import type { ReactNode } from "react";

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function buildCalendarWeeks(year: number, monthNum: number): (number | null)[][] {
  const firstDayOfWeek = new Date(year, monthNum - 1, 1).getDay();
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = new Array(firstDayOfWeek).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

interface Props {
  year: number;
  monthNum: number;
  renderCell: (day: number) => ReactNode;
  onSelectDay?: (day: number) => void;
}

export default function MonthCalendar({ year, monthNum, renderCell, onSelectDay }: Props) {
  const weeks = buildCalendarWeeks(year, monthNum);

  return (
    <div className="calendar-grid">
      {WEEKDAY_LABELS.map((w) => (
        <div key={w} className="calendar-weekday">
          {w}
        </div>
      ))}
      {weeks.flatMap((week, wi) =>
        week.map((day, di) =>
          day == null ? (
            <div key={`${wi}-${di}`} className="calendar-cell empty" />
          ) : (
            <button
              key={`${wi}-${di}`}
              className="calendar-cell"
              onClick={() => onSelectDay?.(day)}
            >
              <div className="calendar-day-num">{day}</div>
              {renderCell(day)}
            </button>
          )
        )
      )}
    </div>
  );
}
