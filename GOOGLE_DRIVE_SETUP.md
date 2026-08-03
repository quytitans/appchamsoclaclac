# Hướng dẫn cấu hình Google Drive cho tính năng upload ảnh

App dùng chính Google Drive cá nhân của bạn để lưu ảnh (qua OAuth2), không dùng Service Account. Làm theo các bước dưới đây **một lần duy nhất**.

## 1. Tạo project trên Google Cloud

1. Vào https://console.cloud.google.com/
2. Tạo project mới (hoặc dùng project có sẵn), ví dụ tên `lac-lac-be-yeu`.

## 2. Bật Google Drive API

1. Trong project vừa tạo, vào **APIs & Services → Library**.
2. Tìm **Google Drive API** → bấm **Enable**.

## 3. Cấu hình màn hình xin quyền (OAuth consent screen)

1. Vào **APIs & Services → OAuth consent screen**.
2. Chọn **External**, bấm **Create**.
3. Điền tên app (ví dụ "Lạc Lạc Bé Yêu"), email liên hệ — các trường khác để mặc định, **Save and Continue** qua các bước.
4. Ở bước **Test users**, bấm **Add users** và thêm chính email Google bạn dùng để lưu ảnh vào. App ở trạng thái "Testing" vẫn dùng được ngay, không cần Google duyệt — **nhưng refresh token sẽ tự hết hạn sau 7 ngày** khi còn ở Testing (đây là giới hạn cứng của Google, không liên quan gì đến việc dùng app hay không). Vì vậy **bắt buộc** phải làm thêm bước sau: vào **OAuth consent screen → Audience** và bấm **"Publish App"** để chuyển sang **"In production"** — việc này không cần Google verify (vì chỉ xin scope hẹp `drive.file`), chỉ hiện cảnh báo "unverified app" một lần lúc xin quyền (bấm Advanced → Go to [tên app] (unsafe) là qua). Bỏ qua bước Publish App là nguyên nhân phổ biến nhất khiến upload ảnh đột nhiên báo lỗi `invalid_grant` sau ~1 tuần.

## 4. Tạo OAuth Client ID

1. Vào **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
2. Application type chọn **Desktop app**, đặt tên tuỳ ý.
3. Bấm **Create** → copy **Client ID** và **Client secret**.

## 5. Tạo folder trên Google Drive để lưu ảnh

1. Vào https://drive.google.com , tạo 1 folder mới (ví dụ "Lạc Lạc Bé Yêu - Ảnh").
2. Mở folder đó, lấy **folder ID** từ URL trên trình duyệt:
   `https://drive.google.com/drive/folders/<FOLDER_ID>` → phần `<FOLDER_ID>` chính là giá trị cần dùng.

## 6. Điền file `.env`

Tạo file `server/.env` (copy từ `server/.env.example`), điền:

```
GOOGLE_OAUTH_CLIENT_ID=<Client ID ở bước 4>
GOOGLE_OAUTH_CLIENT_SECRET=<Client secret ở bước 4>
GOOGLE_OAUTH_REFRESH_TOKEN=
GOOGLE_DRIVE_FOLDER_ID=<Folder ID ở bước 5>
```

(`GOOGLE_OAUTH_REFRESH_TOKEN` để trống, sẽ điền ở bước tiếp theo.)

## 7. Lấy refresh token

Trong thư mục `server`, chạy:

```bash
npm run drive:auth
```

Script sẽ in ra 1 link — mở link đó trong trình duyệt, đăng nhập đúng Google account bạn muốn dùng để lưu ảnh (phải nằm trong danh sách **Test users** ở bước 3), đồng ý cấp quyền. Sau khi thấy trang báo "Đã nhận mã xác thực", quay lại terminal — script sẽ in ra dòng:

```
GOOGLE_OAUTH_REFRESH_TOKEN=xxxxxxx
```

Dán dòng này vào `server/.env` (thay cho dòng `GOOGLE_OAUTH_REFRESH_TOKEN=` đang trống).

## 8. Khởi động lại server

```bash
cd server
npm run dev
```

Từ giờ mọi ảnh upload qua API `/api/uploads/image` sẽ được resize và lưu vào đúng folder Drive đã chỉ định ở bước 5.

## Lưu ý

- Quyền xin chỉ giới hạn ở scope `drive.file` — app chỉ đọc/ghi/xoá được **các file do chính app tạo ra**, không đụng tới file khác trong Drive của bạn.
- Refresh token không tự hết hạn theo thời gian **miễn app đã ở trạng thái "In production"** (xem bước 3). Nó chỉ chết nếu bạn tự thu hồi quyền tại https://myaccount.google.com/permissions, đổi mật khẩu Google, hoặc không dùng suốt 6 tháng liền.
- Nếu sau này cần đổi sang Google account khác hoặc đổi folder lưu ảnh, lặp lại bước 5–7.
