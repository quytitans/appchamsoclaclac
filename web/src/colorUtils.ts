const COLOR_COUNT = 6;

// Màu gradient của 1 vắc-xin phụ thuộc vào id (ổn định, không đổi khi sắp xếp/lọc lại
// danh sách) — dùng chung giữa lưới sổ tiêm chủng và danh sách "mũi tiêm tiếp theo".
export function colorIndexForId(id: number): number {
  return Math.abs(id) % COLOR_COUNT;
}
