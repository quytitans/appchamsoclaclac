// Mobile browsers (and especially "Add to Home Screen" apps on iOS) restore a backgrounded tab
// from memory without ever re-requesting index.html — so even with index.html marked no-store,
// a phone can keep running an old bundle for days after a deploy. Whenever the app comes back to
// the foreground, ask the server which bundle is current and reload if it differs.

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const BUNDLE_RE = /assets\/index-[A-Za-z0-9_-]+\.js/;

function currentBundle(): string | null {
  for (const s of Array.from(document.querySelectorAll<HTMLScriptElement>("script[src]"))) {
    const match = s.src.match(BUNDLE_RE);
    if (match) return match[0];
  }
  return null;
}

async function latestBundle(): Promise<string | null> {
  const res = await fetch(`${import.meta.env.BASE_URL}?v=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.text()).match(BUNDLE_RE)?.[0] ?? null;
}

// Đang gõ dở (form nhật ký, ghi chú...) thì không tự reload kẻo mất chữ — chỉ hiện nút để người
// dùng tự bấm khi xong.
function hasUnsavedTyping(): boolean {
  const fields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    "textarea, input[type=text], input[type=number], input:not([type])"
  );
  return Array.from(fields).some((el) => el.value.trim() !== "" && el.value !== el.defaultValue);
}

function showUpdateBanner(): void {
  if (document.getElementById("app-update-banner")) return;
  const banner = document.createElement("button");
  banner.id = "app-update-banner";
  banner.type = "button";
  banner.className = "app-update-banner";
  banner.textContent = "✨ Đã có phiên bản mới — bấm để tải lại";
  banner.onclick = () => window.location.reload();
  document.body.appendChild(banner);
}

export function startVersionCheck(): void {
  const running = currentBundle();
  // Dev server (vite) không có bundle đã hash — không có gì để so.
  if (!running) return;

  let checking = false;
  async function check() {
    if (checking) return;
    checking = true;
    try {
      const latest = await latestBundle();
      if (!latest || latest === running) return;
      if (hasUnsavedTyping()) showUpdateBanner();
      else window.location.reload();
    } catch {
      // Mất mạng tạm thời — lần kiểm tra sau sẽ thử lại.
    } finally {
      checking = false;
    }
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) check();
  });
  window.addEventListener("focus", check);
  window.setInterval(() => {
    if (document.visibilityState === "visible") check();
  }, CHECK_INTERVAL_MS);
}
