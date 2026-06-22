import { useCallback, useEffect, useState } from "react";
import { fetchMonthStats } from "../api";
import { currentMonthStr, shiftMonthStr } from "../dateUtils";
import type { MonthStatsResponse } from "../types";
import MonthCalendar from "../components/MonthCalendar";

interface Props {
  account: string;
  onSelectDate: (dateStr: string) => void;
}

export default function MonthView({ account, onSelectDate }: Props) {
  const [month, setMonth] = useState(currentMonthStr());
  const [data, setData] = useState<MonthStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(() => {
    setLoading(true);
    return fetchMonthStats(month, account)
      .then(setData)
      .finally(() => setLoading(false));
  }, [month, account]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [yearStr, monthNumStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthNumStr);
  const dayMap = new Map((data?.days ?? []).map((d) => [Number(d.date.slice(-2)), d]));

  function handleSelectDay(day: number) {
    onSelectDate(`${month}-${String(day).padStart(2, "0")}`);
  }

  return (
    <div className="month-view">
      <div className="date-filter">
        <label>Xem theo tháng</label>
        <div className="date-nav">
          <button className="date-nav-button" onClick={() => setMonth((m) => shiftMonthStr(m, -1))}>
            ‹
          </button>
          <span className="month-label">
            Tháng {monthNum}/{year}
          </span>
          <button className="date-nav-button" onClick={() => setMonth((m) => shiftMonthStr(m, 1))}>
            ›
          </button>
        </div>
      </div>

      {loading && <p className="loading-text">Đang tải...</p>}

      {!loading && data && (
        <>
          <section className="month-section">
            <h3 className="month-section-title">🍼 Ăn uống theo ngày</h3>
            <MonthCalendar
              year={year}
              monthNum={monthNum}
              onSelectDay={handleSelectDay}
              renderCell={(day) => {
                const stat = dayMap.get(day);
                if (!stat) return null;
                return (
                  <>
                    {stat.feedCount > 0 && <div className="calendar-stat feed">{stat.feedCount} cữ</div>}
                    {stat.bottleMl > 0 && <div className="calendar-stat bottle">{stat.bottleMl}ml</div>}
                    {stat.bottleAvgMl > 0 && (
                      <div className="calendar-stat avg">{stat.bottleAvgMl.toFixed(0)}ml</div>
                    )}
                  </>
                );
              }}
            />
            <div className="calendar-legend">
              <span>
                <i className="legend-dot feed" /> Số cữ ăn
              </span>
              <span>
                <i className="legend-dot bottle" /> ML ti bình
              </span>
              <span>
                <i className="legend-dot avg" /> TB ml/lần
              </span>
            </div>
          </section>

          <section className="month-section">
            <h3 className="month-section-title">⚖️ Cân nặng &amp; chiều cao</h3>
            <MonthCalendar
              year={year}
              monthNum={monthNum}
              onSelectDay={handleSelectDay}
              renderCell={(day) => {
                const stat = dayMap.get(day);
                if (!stat) return null;
                return (
                  <>
                    {stat.weightKg != null && <div className="calendar-stat weight">{stat.weightKg}kg</div>}
                    {stat.heightCm != null && <div className="calendar-stat height">{stat.heightCm}cm</div>}
                  </>
                );
              }}
            />
            <div className="calendar-legend">
              <span>
                <i className="legend-dot weight" /> Cân nặng (kg)
              </span>
              <span>
                <i className="legend-dot height" /> Chiều cao (cm)
              </span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
