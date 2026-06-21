import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { confirmVaccineDose, fetchVaccines, reorderVaccine } from "../api";
import { todayDateStr } from "../dateUtils";
import VaccineDetailCard from "./VaccineDetailCard";
import type { VaccineSummary } from "../types";

interface Props {
  account: string;
}

export default function VaccineList({ account }: Props) {
  const [vaccines, setVaccines] = useState<VaccineSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [mountedIds, setMountedIds] = useState<Set<number>>(new Set());

  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmDate, setConfirmDate] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [refreshKeys, setRefreshKeys] = useState<Map<number, number>>(new Map());
  const [search, setSearch] = useState("");

  const filteredVaccines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vaccines;
    return vaccines.filter(
      (v) => v.vaccine_name.toLowerCase().includes(q) || v.disease_name.toLowerCase().includes(q)
    );
  }, [vaccines, search]);

  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const prevRectsRef = useRef<Map<number, DOMRect> | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    return fetchVaccines(account)
      .then(setVaccines)
      .finally(() => setLoading(false));
  }, [account]);

  useEffect(() => {
    load();
  }, [load]);

  useLayoutEffect(() => {
    const prevRects = prevRectsRef.current;
    if (!prevRects) return;
    prevRectsRef.current = null;
    itemRefs.current.forEach((el, vid) => {
      const prev = prevRects.get(vid);
      if (!prev) return;
      const next = el.getBoundingClientRect();
      const deltaY = prev.top - next.top;
      if (Math.abs(deltaY) > 0.5) {
        el.style.transition = "none";
        el.style.transform = `translateY(${deltaY}px)`;
        requestAnimationFrame(() => {
          el.style.transition = "transform 0.3s ease";
          el.style.transform = "";
        });
      }
    });
  }, [vaccines]);

  async function handleMove(id: number, direction: "up" | "down", e: MouseEvent) {
    e.stopPropagation();
    const rects = new Map<number, DOMRect>();
    itemRefs.current.forEach((el, vid) => rects.set(vid, el.getBoundingClientRect()));
    prevRectsRef.current = rects;
    await reorderVaccine(id, account, direction);
    await load();
  }

  function toggleExpand(id: number) {
    setExpandedId((prev) => {
      const next = prev === id ? null : id;
      if (next != null) setMountedIds((s) => (s.has(next) ? s : new Set(s).add(next)));
      return next;
    });
  }

  function openConfirm(v: VaccineSummary) {
    setConfirmingId(v.id);
    setConfirmDate(v.next_dose_date ?? todayDateStr());
  }

  async function handleConfirm(id: number) {
    setConfirming(true);
    try {
      await confirmVaccineDose(id, account, confirmDate);
      setConfirmingId(null);
      setRefreshKeys((prev) => {
        const next = new Map(prev);
        next.set(id, (next.get(id) ?? 0) + 1);
        return next;
      });
      await load();
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return <p className="loading-text">Đang tải...</p>;
  if (vaccines.length === 0) {
    return <p className="loading-text">Chưa có vắc-xin nào được ghi nhận</p>;
  }

  const today = todayDateStr();

  return (
    <div className="vaccine-list">
      <input
        type="text"
        className="account-search-input"
        placeholder="🔍 Tìm theo tên vắc-xin..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {filteredVaccines.length === 0 && <p className="loading-text">Không tìm thấy vắc-xin nào</p>}
      {filteredVaccines.map((v, idx) => {
        const isOverdue = v.next_dose_date != null && v.next_dose_date <= today;
        return (
          <div
            key={v.id}
            className="vaccine-list-card"
            ref={(el) => {
              if (el) itemRefs.current.set(v.id, el);
              else itemRefs.current.delete(v.id);
            }}
          >
            <button className="vaccine-list-item" onClick={() => toggleExpand(v.id)}>
              <div className="vaccine-list-info">
                <div className="vaccine-list-name">{v.vaccine_name}</div>
                <div className="vaccine-list-disease">{v.disease_name}</div>
                <div className="vaccine-list-latest">
                  {v.latestDose ? `Mũi ${v.latestDose.dose_number} • ${v.latestDose.date}` : "Chưa tiêm mũi nào"}
                </div>
                {v.next_dose_date && (
                  <div className={`vaccine-list-next ${isOverdue ? "overdue" : ""}`}>
                    {isOverdue ? "⚠️" : "📅"} Mũi tiếp theo: {v.next_dose_date}
                  </div>
                )}
              </div>
              <div className="vaccine-list-reorder">
                <button
                  className="date-nav-button"
                  disabled={idx === 0}
                  onClick={(e) => handleMove(v.id, "up", e)}
                >
                  ▲
                </button>
                <button
                  className="date-nav-button"
                  disabled={idx === filteredVaccines.length - 1}
                  onClick={(e) => handleMove(v.id, "down", e)}
                >
                  ▼
                </button>
              </div>
            </button>

            {isOverdue && (
              <div className="vaccine-confirm-row">
                {confirmingId === v.id ? (
                  <div className="vaccine-confirm-inline">
                    <input
                      type="date"
                      value={confirmDate}
                      onChange={(e) => setConfirmDate(e.target.value)}
                    />
                    <button
                      className="date-nav-button"
                      onClick={() => handleConfirm(v.id)}
                      disabled={confirming}
                    >
                      ✓
                    </button>
                    <button className="date-nav-button" onClick={() => setConfirmingId(null)}>
                      ✕
                    </button>
                  </div>
                ) : (
                  <button className="vaccine-confirm-button" onClick={() => openConfirm(v)}>
                    ✅ Xác nhận đã tiêm
                  </button>
                )}
              </div>
            )}

            <div className={`vaccine-detail-wrapper ${expandedId === v.id ? "expanded" : ""}`}>
              {mountedIds.has(v.id) && (
                <VaccineDetailCard
                  account={account}
                  vaccineId={v.id}
                  onChanged={load}
                  refreshSignal={refreshKeys.get(v.id) ?? 0}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
