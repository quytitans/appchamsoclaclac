import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";

// Khung cắt ảnh vuông cho The Face: kéo để dịch chuyển, chụm 2 ngón / lăn chuột / thanh
// trượt để zoom. Parent gọi ref.crop() lúc bấm Lưu để lấy đúng vùng đang thấy trong khung.
export interface FaceCropperHandle {
  crop: () => Promise<Blob>;
}

interface Props {
  file: File;
  ref?: React.Ref<FaceCropperHandle>;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
// Server resize ảnh full về tối đa 1600px — ảnh vuông 1200px là đủ nét cho gương mặt.
const OUTPUT_MAX = 1200;

interface View {
  zoom: number;
  x: number;
  y: number;
}

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

export default function FaceCropper({ file, ref }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [frameSize, setFrameSize] = useState(0);
  const [view, setView] = useState<View>({ zoom: 1, x: 0, y: 0 });
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const gestureRef = useRef<{ dist: number; zoom: number; mid: { x: number; y: number } } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setNatural(null);
    setView({ zoom: 1, x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const update = () => setFrameSize(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Tỉ lệ "cover": ở zoom 1 cạnh ngắn của ảnh vừa khít khung vuông.
  const baseScale = natural && frameSize ? Math.max(frameSize / natural.w, frameSize / natural.h) : 1;

  // Giữ ảnh luôn phủ kín khung — không cho kéo lộ khoảng trống ra ngoài mép ảnh.
  function clampView(v: View): View {
    if (!natural || !frameSize) return v;
    const dispW = natural.w * baseScale * v.zoom;
    const dispH = natural.h * baseScale * v.zoom;
    const maxX = Math.max(0, (dispW - frameSize) / 2);
    const maxY = Math.max(0, (dispH - frameSize) / 2);
    return { zoom: v.zoom, x: Math.min(maxX, Math.max(-maxX, v.x)), y: Math.min(maxY, Math.max(-maxY, v.y)) };
  }

  function setZoom(next: number) {
    setView((v) => {
      const zoom = clampZoom(next);
      const ratio = zoom / v.zoom;
      return clampView({ zoom, x: v.x * ratio, y: v.y * ratio });
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values());
      gestureRef.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        zoom: view.zoom,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const prev = pointersRef.current.get(e.pointerId);
    if (!prev) return;
    const curr = { x: e.clientX, y: e.clientY };
    pointersRef.current.set(e.pointerId, curr);

    if (pointersRef.current.size >= 2 && gestureRef.current) {
      const [a, b] = Array.from(pointersRef.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const g = gestureRef.current;
      const dx = mid.x - g.mid.x;
      const dy = mid.y - g.mid.y;
      g.mid = mid;
      setView((v) => {
        const zoom = clampZoom((g.zoom * dist) / g.dist);
        const ratio = zoom / v.zoom;
        return clampView({ zoom, x: v.x * ratio + dx, y: v.y * ratio + dy });
      });
      return;
    }

    setView((v) => clampView({ ...v, x: v.x + curr.x - prev.x, y: v.y + curr.y - prev.y }));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) gestureRef.current = null;
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    setZoom(view.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
  }

  useImperativeHandle(ref, () => ({
    crop: async () => {
      const img = imgRef.current;
      if (!img || !natural || !frameSize) throw new Error("Ảnh chưa tải xong, vui lòng thử lại");
      const dispScale = baseScale * view.zoom;
      const dispW = natural.w * dispScale;
      const dispH = natural.h * dispScale;
      const imgLeft = frameSize / 2 + view.x - dispW / 2;
      const imgTop = frameSize / 2 + view.y - dispH / 2;
      const sx = -imgLeft / dispScale;
      const sy = -imgTop / dispScale;
      const sSize = frameSize / dispScale;
      const outSize = Math.max(1, Math.round(Math.min(OUTPUT_MAX, sSize)));

      const canvas = document.createElement("canvas");
      canvas.width = outSize;
      canvas.height = outSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Trình duyệt không hỗ trợ cắt ảnh");
      ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, outSize, outSize);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("Không cắt được ảnh, vui lòng thử lại");
      return blob;
    },
  }));

  const imgW = natural ? natural.w * baseScale : 0;
  const imgH = natural ? natural.h * baseScale : 0;

  return (
    <div className="face-cropper">
      <div
        ref={frameRef}
        className="face-cropper-frame"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {src && (
          <img
            ref={imgRef}
            src={src}
            alt="Ảnh đang chỉnh"
            draggable={false}
            onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            style={{
              width: imgW || undefined,
              height: imgH || undefined,
              visibility: natural ? "visible" : "hidden",
              transform: `translate(-50%, -50%) translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
            }}
          />
        )}
        <div className="face-cropper-guide" aria-hidden="true" />
      </div>
      <div className="face-cropper-zoom">
        <button type="button" onClick={() => setZoom(view.zoom / 1.25)} aria-label="Thu nhỏ">
          −
        </button>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={view.zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Mức phóng to"
        />
        <button type="button" onClick={() => setZoom(view.zoom * 1.25)} aria-label="Phóng to">
          +
        </button>
      </div>
      <div className="face-cropper-hint">Kéo để di chuyển · chụm 2 ngón hoặc kéo thanh trượt để phóng to</div>
    </div>
  );
}
