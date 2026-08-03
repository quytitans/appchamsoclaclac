const APP_TIMEZONE = "Asia/Ho_Chi_Minh";

// Không dùng new Date().toISOString().slice(0, 10) — luôn trả về ngày theo giờ UTC,
// lệch với ngày lịch thực tế ở Việt Nam (UTC+7) tới 7 tiếng đầu mỗi ngày, khiến các mốc
// "đến hạn hôm nay" (tiêm chủng...) chỉ được phát hiện muộn hơn thực tế.
export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(new Date());
}

// Cộng giờ vào một chuỗi "YYYY-MM-DDTHH:mm" theo kiểu lịch thuần (naive) — không qua giờ hệ
// thống/timezone của server, để "hết hạn sau 30 giờ" luôn đúng 30 giờ đồng hồ treo tường bất
// kể server chạy ở múi giờ nào. Dùng Date.UTC() chỉ như một khung tính toán, không đại diện
// cho giờ UTC thật.
export function addHoursToNaiveDateTime(naive: string, hours: number): string {
  const [datePart, timePart] = naive.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  const ms = Date.UTC(y, m - 1, d, hh, mm) + hours * 3600000;
  const dt = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
}
