import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { confirmVaccineDose, fetchVaccines, reorderVaccine } from "../api";
import { todayDateStr } from "../dateUtils";
import VaccineDetailCard from "./VaccineDetailCard";
import type { VaccineSummary } from "../types";

interface FocusRequest {
  vaccineId: number;
  nonce: number;
}

interface Props {
  account: string;
  focusRequest?: FocusRequest | null;
}

function unfollowedStorageKey(account: string): string {
  return `vaccine_unfollowed_${account}`;
}

function loadUnfollowedIds(account: string): Set<number> {
  try {
    const raw = localStorage.getItem(unfollowedStorageKey(account));
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function FollowToggle({
  following,
  onToggle,
}: {
  following: boolean;
  onToggle: (e: MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      className={`vaccine-follow-toggle ${following ? "on" : ""}`}
      onClick={onToggle}
      role="switch"
      aria-checked={following}
      aria-label={following ? "Bỏ theo dõi" : "Theo dõi lại"}
      title={following ? "Bỏ theo dõi" : "Theo dõi lại"}
    >
      <span className="vaccine-follow-toggle-knob" />
    </button>
  );
}

export default function VaccineList({ account, focusRequest }: Props) {
  const [vaccines, setVaccines] = useState<VaccineSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalId, setModalId] = useState<number | null>(null);
  const [detailRefreshSignal, setDetailRefreshSignal] = useState(0);
  const [unfollowedIds, setUnfollowedIds] = useState<Set<number>>(() => loadUnfollowedIds(account));

  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [confirmDate, setConfirmDate] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setUnfollowedIds(loadUnfollowedIds(account));
  }, [account]);

  useEffect(() => {
    try {
      localStorage.setItem(unfollowedStorageKey(account), JSON.stringify([...unfollowedIds]));
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [account, unfollowedIds]);

  function toggleFollow(id: number, e?: MouseEvent) {
    e?.stopPropagation();
    setUnfollowedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filteredVaccines = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vaccines;
    return vaccines.filter(
      (v) => v.vaccine_name.toLowerCase().includes(q) || v.disease_name.toLowerCase().includes(q)
    );
  }, [vaccines, search]);

  const gridVaccines = useMemo(
    () => filteredVaccines.filter((v) => !unfollowedIds.has(v.id)),
    [filteredVaccines, unfollowedIds]
  );
  const collapsedVaccines = useMemo(
    () => filteredVaccines.filter((v) => unfollowedIds.has(v.id)),
    [filteredVaccines, unfollowedIds]
  );

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

  useEffect(() => {
    if (!focusRequest) return;
    setModalId(focusRequest.vaccineId);
  }, [focusRequest]);

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

  function openConfirm(v: VaccineSummary) {
    setConfirmingId(v.id);
    setConfirmDate(v.nextDue?.date ?? todayDateStr());
  }

  async function handleConfirm(id: number) {
    setConfirming(true);
    try {
      await confirmVaccineDose(id, account, confirmDate);
      setConfirmingId(null);
      setDetailRefreshSignal((k) => k + 1);
      await load();
    } finally {
      setConfirming(false);
    }
  }

  if (loading && vaccines.length === 0) return <p className="loading-text">Đang tải...</p>;
  if (!loading && vaccines.length === 0) {
    return <p className="loading-text">Chưa có vắc-xin nào được ghi nhận</p>;
  }

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
      <div className="vaccine-grid">
        {gridVaccines.map((v, idx) => {
          const isOverdue = v.nextDue?.overdue ?? false;
          return (
            <div
              key={v.id}
              className="vaccine-list-card"
              ref={(el) => {
                if (el) itemRefs.current.set(v.id, el);
                else itemRefs.current.delete(v.id);
              }}
            >
              <button className="vaccine-list-item" onClick={() => setModalId(v.id)}>
                <div className="vaccine-card-top">
                  <span className="vaccine-list-icon">💉</span>
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
                      disabled={idx === gridVaccines.length - 1}
                      onClick={(e) => handleMove(v.id, "down", e)}
                    >
                      ▼
                    </button>
                    <FollowToggle following={!unfollowedIds.has(v.id)} onToggle={(e) => toggleFollow(v.id, e)} />
                  </div>
                </div>
                <div className="vaccine-list-info">
                  <div className="vaccine-list-name">{v.vaccine_name}</div>
                  <div className="vaccine-list-disease">{v.disease_name}</div>
                  <div className="vaccine-card-spacer" />
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
            </div>
          );
        })}
      </div>

      {collapsedVaccines.length > 0 && (
        <div className="vaccine-collapsed-list">
          <div className="vaccine-collapsed-title">🔕 Đã bỏ theo dõi ({collapsedVaccines.length})</div>
          {collapsedVaccines.map((v) => (
            <div key={v.id} className="vaccine-collapsed-row">
              <button type="button" className="vaccine-collapsed-info" onClick={() => setModalId(v.id)}>
                <span className="vaccine-collapsed-icon">💉</span>
                <span className="vaccine-collapsed-name">{v.vaccine_name}</span>
              </button>
              <div className="vaccine-collapsed-follow">
                <span className="vaccine-collapsed-follow-label">Theo dõi lại</span>
                <FollowToggle following={false} onToggle={(e) => toggleFollow(v.id, e)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {modalId != null && (
        <div className="vaccine-modal-overlay" onClick={() => setModalId(null)}>
          <div className="vaccine-modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💉 {vaccines.find((v) => v.id === modalId)?.vaccine_name}</h3>
              <button className="modal-close" onClick={() => setModalId(null)} aria-label="Đóng">
                ✕
              </button>
            </div>
            <VaccineDetailCard
              account={account}
              vaccineId={modalId}
              onChanged={load}
              refreshSignal={detailRefreshSignal}
            />
          </div>
        </div>
      )}
    </div>
  );
}
