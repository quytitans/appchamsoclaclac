import { auth, drive } from "@googleapis/drive";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Chưa cấu hình Google Drive: thiếu biến môi trường ${name} — xem hướng dẫn trong GOOGLE_DRIVE_SETUP.md`
    );
  }
  return value;
}

export function getDriveFolderId(): string {
  return requireEnv("GOOGLE_DRIVE_FOLDER_ID");
}

let cachedClient: ReturnType<typeof drive> | null = null;

// Một OAuth2Client mới không có access_token cache sẵn — lần gọi Drive API đầu tiên của nó
// luôn phải trả giá thêm 1 round-trip riêng tới máy chủ OAuth Google để đổi refresh_token lấy
// access_token, trước khi request Drive thật sự chạy. Tạo mới client này ở MỖI lần upload/xoá
// ảnh (như code cũ) nghĩa là trả giá round-trip đó lặp lại vô ích ở từng request. Cache 1
// instance duy nhất cho vòng đời process để nó tái dùng access_token còn hạn (~1 giờ, thư viện
// google-auth-library tự refresh khi hết hạn) — không ảnh hưởng gì tới việc phát hiện refresh
// token bị thu hồi/hết hạn thật (invalid_grant vẫn xảy ra bình thường, độc lập với việc cache).
export function getDriveClient() {
  if (cachedClient) return cachedClient;

  const clientId = requireEnv("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = requireEnv("GOOGLE_OAUTH_CLIENT_SECRET");
  const refreshToken = requireEnv("GOOGLE_OAUTH_REFRESH_TOKEN");

  const oauth2Client = new auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  cachedClient = drive({ version: "v3", auth: oauth2Client });
  return cachedClient;
}
