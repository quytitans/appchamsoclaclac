import { useEffect, useRef, useState } from "react";
import type { UploadedImage } from "../types";

interface Props {
  photos: UploadedImage[];
  startIndex: number;
  onClose: () => void;
}

export default function PhotoLightbox({ photos, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(photos.length - 1, next)));
  }

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
    startX.current = e.clientX;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    setDragOffset(e.clientX - startX.current);
  }

  function handlePointerUp() {
    if (!dragging) return;
    const threshold = 60;
    if (dragOffset < -threshold) goTo(index + 1);
    else if (dragOffset > threshold) goTo(index - 1);
    setDragging(false);
    setDragOffset(0);
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

      {index > 0 && (
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
      {index < photos.length - 1 && (
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
        style={{
          transform: `translateX(calc(-${index * 100}% + ${dragOffset}px))`,
          transition: dragging ? "none" : "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {photos.map((photo) => (
          <div className="lightbox-slide" key={photo.id}>
            <img src={photo.full_url} alt="" draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
