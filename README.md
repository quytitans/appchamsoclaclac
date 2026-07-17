# Lạc Lạc Bé Yêu

Ứng dụng web mobile-first ghi nhật ký hoạt động hàng ngày cho bé (hút sữa, ti mẹ, ti bình, vệ sinh, cân nặng, chiều cao, tùy chọn) và xem thống kê theo ngày.

## Cấu trúc

```
lac-lac-be-yeu/
├── server/   Node.js + Express + TypeScript + node:sqlite (API + phục vụ giao diện)
└── web/      React + TypeScript + Vite (giao diện mobile)
```

## Chạy local (development)

```bash
# Terminal 1 - backend (cổng 3000)
cd server
npm install
npm run dev

# Terminal 2 - frontend (cổng 5173, proxy /api -> 3000)
cd web
npm install
npm run dev
```

## Build production

```bash
cd web && npm install && npm run build   # tạo web/dist
cd ../server && npm install && npm run build  # tạo server/dist
```

Sau khi build, server sẽ tự phục vụ `web/dist` qua `express.static` trên cùng 1 cổng (mặc định `3000`, đổi qua biến môi trường `PORT`).

## Deploy lên AZDigi SSD Pro VPS

1. **Cài Node.js >= 22.5** trên VPS (để có sẵn `node:sqlite`).
2. Clone code lên VPS, build theo bước "Build production" ở trên.
3. Cài **PM2** toàn cục: `npm install -g pm2`.
4. Chạy app bằng PM2 (file cấu hình `ecosystem.config.cjs` ở thư mục gốc):
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup   # để PM2 tự khởi động lại cùng VPS sau khi reboot
   ```
5. **Nginx reverse proxy**: tạo site trỏ domain về `http://127.0.0.1:3000`, ví dụ:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
6. **SSL miễn phí với Certbot**:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

## Mã PIN

Ứng dụng yêu cầu nhập mã PIN gồm 4 chữ số mỗi khi mở lại trang. Mã PIN mặc định ban đầu là **0000**, đổi ngay sau khi deploy qua nút "🔒 Đổi Pass" ở màn hình chính. Mã PIN được lưu dưới dạng hash (SHA-256) trong `server/database.sqlite`, không lưu dạng chữ rõ.

## Backup dữ liệu

Toàn bộ dữ liệu nằm trong file `server/database.sqlite`. Backup bằng cách copy file này ra nơi lưu trữ khác (không commit vào Git — đã có trong `.gitignore`).

## An toàn khi deploy

**Trước khi deploy/upgrade, đọc [`DEPLOY_SAFETY.md`](./DEPLOY_SAFETY.md)** — nguyên tắc bắt buộc: không làm mất dữ liệu cũ, không seed dữ liệu rác vào DB thật, không ảnh hưởng các app khác đang chạy cùng hosting.
