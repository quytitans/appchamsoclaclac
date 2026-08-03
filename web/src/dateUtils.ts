export function todayDateStr(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

export function shiftDateStr(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function currentMonthStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonthStr(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDateVN(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function nowTimeStr(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Cộng giờ vào chuỗi "YYYY-MM-DDTHH:mm" theo kiểu lịch thuần (naive) — không qua giờ hệ thống/
// timezone của trình duyệt, để "hết hạn sau 30 giờ" luôn đúng 30 giờ đồng hồ treo tường. Phải
// khớp hệt với addHoursToNaiveDateTime ở server/src/dateUtils.ts.
export function addHoursToNaiveDateTime(naive: string, hours: number): string {
  const [datePart, timePart] = naive.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const ms = Date.UTC(y, m - 1, d, hh, mm) + hours * 3600000;
  const dt = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
}

// Tỉ lệ thời gian đã trôi qua giữa lúc lấy ra và lúc hết hạn, tính tại thời điểm gọi hàm
// (không tick sống — chỉ tính lại mỗi lần component render, khớp yêu cầu "tính lại mỗi lần
// vào view trang thống kê"). new Date() parse chuỗi "YYYY-MM-DDTHH:mm" theo giờ địa phương.
export function elapsedFraction(takenOutAt: string, expiryAt: string): number {
  const start = new Date(takenOutAt).getTime();
  const end = new Date(expiryAt).getTime();
  const now = Date.now();
  if (end <= start) return 1;
  return Math.min(1, Math.max(0, (now - start) / (end - start)));
}

export function formatDateTimeVN(naive: string): string {
  const [datePart, timePart] = naive.split("T");
  return `${formatDateVN(datePart)} ${timePart}`;
}
