const APP_TIMEZONE = "Asia/Ho_Chi_Minh";

// Không dùng new Date().toISOString().slice(0, 10) — luôn trả về ngày theo giờ UTC,
// lệch với ngày lịch thực tế ở Việt Nam (UTC+7) tới 7 tiếng đầu mỗi ngày, khiến các mốc
// "đến hạn hôm nay" (tiêm chủng...) chỉ được phát hiện muộn hơn thực tế.
export function todayStr(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE }).format(new Date());
}
