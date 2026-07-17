# Nguyên tắc an toàn khi deploy

Áp dụng cho mọi lần deploy/upgrade app này (`laclac`) lên VPS `quytitans.com`. Ba nguyên tắc cốt lõi — **không được vi phạm**, kể cả khi bị hối deploy nhanh:

## 1. Không làm mất dữ liệu cũ

- Toàn bộ dữ liệu thật nằm trong `server/database.sqlite` trên VPS — file này **không nằm trong Git** (`.gitignore`).
- Upgrade code bằng `git pull` + build lại (`tsc`, `vite build`). **Tuyệt đối không** `rm -rf` thư mục rồi clone lại — thao tác đó xoá luôn file DB không được Git theo dõi.
- Trước khi pull/deploy, luôn backup: `cp server/database.sqlite server/database.sqlite.bak-$(date +%Y%m%d-%H%M%S)`.
- Thay đổi schema (thêm cột/bảng) phải để code tự migrate lúc khởi động (`CREATE TABLE IF NOT EXISTS` + `PRAGMA table_info` + `ALTER TABLE ADD COLUMN`) — không sửa tay file DB trên production.
- Sau khi deploy, kiểm chứng lại số dòng dữ liệu chính (vaccines, records, accounts...) không đổi so với trước khi pull.

## 2. Không seed dữ liệu rác vào DB thật

- Dữ liệu test/thử nghiệm (vắc-xin "TEST - ...", tài khoản test, v.v.) **chỉ được tạo trên `server/database.sqlite` ở máy local**, không bao giờ chạy script seed nhắm vào DB trên VPS.
- Trước khi deploy, rà lại xem có thay đổi/migration nào vô tình sẽ chèn dữ liệu mẫu vào DB thật không (ví dụ seed script chạy nhầm môi trường).
- Nếu cần dữ liệu test để verify tính năng sau khi deploy, dùng tài khoản/bản ghi đã có sẵn trên production để quan sát, không tự thêm bản ghi giả.

## 3. Không ảnh hưởng tới các app khác đang chạy cùng hosting

VPS này lưu trữ **nhiều app dùng chung** dưới PM2 + Nginx theo path (`quytitans.com/<app>`). Tính đến nay có: `laclac` (app này), `appchamcong`, `oxaenglish`.

- Chỉ `pm2 restart <tên-process-của-app-này>` — không dùng `pm2 restart all`, không `pm2 reload` toàn bộ, không đụng tới cấu hình Nginx/ecosystem của app khác.
- Không sửa `/etc/nginx/sites-available/quytitans.com` ngoài phần `location` của app này.
- Trước và sau khi deploy, chạy `pm2 list` và so sánh **PID + uptime** của các app khác — phải giữ nguyên (chứng minh chúng không bị restart/ảnh hưởng).
- Sau deploy, curl thử URL public của (các) app khác để xác nhận vẫn trả về 200, không chỉ kiểm tra app vừa deploy.
- Nếu chỉ đổi frontend (web/dist) thì không cần restart server process — `express.static` đọc file trực tiếp từ đĩa mỗi request.

## Quy trình tham chiếu

Xem chi tiết SSH access, path, port, PM2 process name của từng app trong bộ nhớ dự án (`project-quytitans-vps-hosting`). File này chỉ ghi nguyên tắc, không lặp lại thông tin truy cập.
