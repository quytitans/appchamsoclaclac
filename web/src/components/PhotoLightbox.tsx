import { useEffect, useRef, useState } from "react";
import type { UploadedImage } from "../types";

interface Props {
  photos: UploadedImage[];
  startIndex: number;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const DOUBLE_TAP_ZOOM = 2.5;
const DOUBLE_TAP_MS = 300;

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export default function PhotoLightbox({ photos, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // While a finger is actively driving zoom/pan, the transform must apply instantly —
  // any CSS transition on it fights the touch, since each pointermove sets a new target
  // before the previous transition finishes, so the image visibly lags/judders behind
  // the finger (very noticeable on iOS Safari's compositor). Only animate outside of
  // that window (double-tap toggle, release-to-reset snap).
  const [isInteracting, setIsInteracting] = useState(false);

  const startX = useRef(0);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchStartDist = useRef(0);
  const pinchStartZoom = useRef(1);
  const panStart = useRef({ x: 0, y: 0 });
  const panOrigin = useRef({ x: 0, y: 0 });
  const lastTap = useRef(0);

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(photos.length - 1, next)));
  }

  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function toggleZoom() {
    if (zoom > 1) resetZoom();
    else setZoom(DOUBLE_TAP_ZOOM);
  }

  // Ảnh khác nhau (đổi index) luôn bắt đầu từ trạng thái chưa zoom — vuốt sang ảnh
  // kế tiếp không được giữ lại mức zoom/pan của ảnh trước.
  useEffect(() => {
    resetZoom();
  }, [index]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      setDragging(false);
      setDragOffset(0);
      setIsInteracting(true);
      const pts = Array.from(pointers.current.values());
      pinchStartDist.current = distance(pts[0], pts[1]);
      pinchStartZoom.current = zoom;
      return;
    }

    if (pointers.current.size === 1) {
      const now = Date.now();
      const isDoubleTap = now - lastTap.current < DOUBLE_TAP_MS;
      lastTap.current = now;
      if (isDoubleTap) {
        toggleZoom();
        return;
      }
      if (zoom > 1) {
        setIsInteracting(true);
        panStart.current = { x: e.clientX, y: e.clientY };
        panOrigin.current = pan;
      } else {
        startX.current = e.clientX;
        setDragging(true);
      }
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      if (pinchStartDist.current > 0) {
        const dist = distance(pts[0], pts[1]);
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartZoom.current * (dist / pinchStartDist.current)));
        setZoom(next);
      }
      return;
    }

    if (zoom > 1) {
      setPan({
        x: panOrigin.current.x + (e.clientX - panStart.current.x),
        y: panOrigin.current.y + (e.clientY - panStart.current.y),
      });
      return;
    }

    if (dragging) {
      setDragOffset(e.clientX - startX.current);
    }
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    pointers.current.delete(e.pointerId);

    if (pointers.current.size === 1) {
      const [[, pos]] = Array.from(pointers.current.entries());
      if (zoom > 1) {
        panStart.current = pos;
        panOrigin.current = pan;
      } else {
        setIsInteracting(false);
        startX.current = pos.x;
        setDragging(true);
      }
    }

    if (pointers.current.size < 2) {
      pinchStartDist.current = 0;
      if (zoom < MIN_ZOOM + 0.02) resetZoom();
    }

    if (pointers.current.size === 0) {
      setIsInteracting(false);
    }

    if (pointers.current.size === 0 && dragging) {
      const threshold = 60;
      if (dragOffset < -threshold) goTo(index + 1);
      else if (dragOffset > threshold) goTo(index - 1);
      setDragging(false);
      setDragOffset(0);
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z + delta));
      if (next <= MIN_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });
  }

  if (photos.length === 0) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose} aria-label="Đóng">
        ✕
      </button>
      <div className="lightbox-counter">
        {index + 1}/{photos.length}
      </div>

      {zoom === 1 && index > 0 && (
        <button
          className="lightbox-nav lightbox-nav-prev"
          onClick={(e) => {
            e.stopPropagation();
            goTo(index - 1);
          }}
          aria-label="Ảnh trước"
        >
          ‹
        </button>
      )}
      {zoom === 1 && index < photos.length - 1 && (
        <button
          className="lightbox-nav lightbox-nav-next"
          onClick={(e) => {
            e.stopPropagation();
            goTo(index + 1);
          }}
          aria-label="Ảnh sau"
        >
          ›
        </button>
      )}

      <div
        className="lightbox-track"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        style={{
          transform: `translateX(calc(-${index * 100}% + ${dragOffset}px))`,
          transition: dragging ? "none" : "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {photos.map((photo, i) => (
          <div className="lightbox-slide" key={photo.id}>
            <img
              src={photo.full_url}
              alt=""
              draggable={false}
              style={
                i === index
                  ? {
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transition: isInteracting ? "none" : "transform 200ms ease",
                    }
                  : undefined
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
