# TÀI LIỆU ĐẶC TẢ YÊU CẦU PHẦN MỀM (SRS)
## ỨNG DỤNG: LẠC LẠC BÉ YÊU (Version 1.0)

### 1. Tổng quan dự án & Yêu cầu chung
* **Tên ứng dụng:** Lạc Lạc Bé Yêu
* **Loại hình:** Web Application (Ứng dụng web lướt trên trình duyệt di động).
* **Định hướng thiết kế (UI/UX):**
    * **Mobile-First / Mobile-Only:** Giao diện tối ưu hoàn toàn cho thiết bị di động (Mobile). Không cần tối ưu hóa giao diện cho màn hình máy tính (Desktop).
    * **Phong cách thiết kế:** Tông màu chủ đạo là **màu hồng dịu nhẹ**, dễ thương, phù hợp với đối tượng trẻ em (bé gái). Giao diện trực quan, dễ thao tác nhanh bằng một tay.
* **Mục tiêu kỹ thuật:** Hệ thống nhỏ, vận hành đơn giản, chi phí tối thiểu, dễ dàng deploy và bảo trì trên các hạ tầng VPS giá rẻ.

---

### 2. Kiến trúc tổng thể & Công nghệ (Tech Stack)
Ứng dụng được triển khai theo mô hình **Monolith gồm 2 phần trong 1 repository**, build ra và phục vụ chung qua 1 cổng duy nhất để tiết kiệm tài nguyên vận hành:
```
lac-lac-be-yeu/
├── server/      ← Node.js + Express + TypeScript (Xử lý API + Phục vụ giao diện)
└── web/         ← React + TypeScript + Vite (Giao diện Mobile Web)
```

#### 2.1. Backend Stack
* **Runtime:** Node.js (Phiên bản >= 22.5) để tận dụng module `node:sqlite` tích hợp sẵn.
* **Framework:** Express (Tối giản, nhẹ nhàng, tối ưu cho app nhỏ).
* **Ngôn ngữ:** TypeScript (Compile trực tiếp bằng `tsc`, không dùng bundler phức tạp).
* **Cơ sở dữ liệu:** **SQLite qua `node:sqlite` (built-in)**.
    * Lưu trữ tập trung trong 1 file duy nhất (`database.sqlite`).
    * Không dùng driver/ORM ngoài (như Prisma/Knex), viết SQL thuần trực tiếp nhằm giảm lớp trừu tượng.
    * Không dùng công cụ migration ngoài: Cơ chế tự động chạy `CREATE TABLE IF NOT EXISTS` và kiểm tra bảng (`PRAGMA table_info`) khi server khởi động để tự động cập nhật cột cấu trúc khi có thay đổi.

#### 2.2. Frontend Stack
* **Framework:** React 19 + TypeScript.
* **Build Tool:** Vite (Tốc độ build nhanh, cấu hình tối giản).
* **Quản lý State:** Không dùng thư viện ngoài (Redux/Zustand), chỉ sử dụng `useState` và `useEffect` thuần trong nội bộ các component để giữ mã nguồn gọn nhẹ.
* **Routing:** Không dùng thư viện router (React Router v6). Chuyển đổi qua lại giữa các màn hình bằng một state điều hướng (ví dụ: `useState<Screen>('HOME')`) tại component gốc.
* **Styling:** Sử dụng 1 file CSS thuần (`App.css`), đặt class thủ công kết hợp biến CSS (`:root { --main-pink: #FFD1DC; }`) để dễ dàng tùy biến tông màu hồng chủ đạo, không cài đặt Tailwind hay CSS-in-JS.
* **Giao tiếp API:** Tập trung tất cả các lời gọi `fetch` tại một file `api.ts` duy nhất để dễ quản lý và cấu hình.

---

### 3. Chi tiết chức năng (Functional Requirements)

#### 3.1. Màn hình chính (Dashboard/Home)
* **Mô tả:** Là màn hình xuất hiện đầu tiên khi người dùng truy cập vào tên miền ứng dụng.
* **Yêu cầu giao diện:** Hiển thị tên app "Lạc Lạc Bé Yêu" (Style dễ thương) và **2 nút bấm lớn (Card/Button)** để điều hướng nhanh:
    1.  Nút chuyển sang màn hình **"Note Thông Tin"**.
    2.  Nút chuyển sang màn hình **"Xem Thống Kê"**.

#### 3.2. Màn hình "Note Thông Tin"
Màn hình này chứa các form nhập liệu cho các hoạt động hàng ngày của bé. 
> 📌 **Quy tắc hệ thống:** Đối với các trường "Ngày", hệ thống sẽ **tự động lấy ngày hiện tại** theo thời gian thực của thiết bị, người dùng không cần nhập thủ công (trừ phần Cân nặng có thể tùy chỉnh ngày cân).

Hệ thống cho phép ghi nhận các nhóm thông tin sau:
1. **Hút sữa:** Giờ hút (Time picker), Vị trí (Chọn: Bên Trái / Bên Phải), Dung tích (Số - đơn vị: ml).
2. **Ti Mẹ:** Giờ ti mẹ (Time picker), Vị trí (Chọn: Bên Trái / Bên Phải).
3. **Ti bình:** Giờ ti bình (Time picker), Dung tích (Số - đơn vị: ml).
4. **Đi nặng:** Giờ đi nặng (Time picker), Trạng thái (Chọn nhanh: Bình thường / Có vấn đề).
5. **Đi nhẹ:** Giờ đi nhẹ (Time picker).
6. **Cân nặng:** Ngày cân (Date picker), Khối lượng (Số - đơn vị: kg).
7. **Chiều cao:** Kích thước (Số - đơn vị: cm).
8. **Custom (Tùy chọn):** Cho phép người dùng tự định nghĩa thêm hoạt động với các trường: Tên hoạt động, Giá trị, Trạng thái, Ghi chú.

* *Hành động:* Nút **"Lưu"** ở cuối form gửi dữ liệu API về lưu vào DB SQLite.

#### 3.3. Màn hình "Xem Thống Kê"
* **Bộ lọc mặc định:** Toàn bộ dữ liệu hiển thị theo ngày. Khi vừa truy cập, mặc định chọn và hiển thị dữ liệu của **Ngày hiện tại**. Có thanh chọn ngày (Date picker) để xem lại lịch sử các ngày cũ.
* Giao diện được chia làm **2 phần riêng biệt**:

##### 🔸 Phần 1: Chỉ số tổng hợp (KPIs / Summary)
Hiển thị các số liệu tổng hợp tính từ đầu ngày đến giờ hiện tại của ngày đang chọn:
* **Hút sữa & Cho ăn:**
    * Tổng số lần hút sữa & Tổng số ml sữa đã hút.
    * Tổng số lần ti mẹ.
    * Tổng số lần ti bình, Tổng số ml đã ti bình & **Số ml trung bình/mỗi lần ti bình** (= Tổng ml ti bình / Số lần ti bình).
* **Vệ sinh:** Tổng số lần đi nặng & Tổng số lần đi nhẹ.
* **Thể chất (Cân nặng):**
    * Cân nặng hiện tại (lấy bản ghi mới nhất của bé).
    * Chỉ số tăng trưởng: Hệ thống tự động tính toán từ DB và hiển thị số kg tăng thêm trong **1 tuần qua** và **1 tháng qua**.

##### 🔸 Phần 2: Dòng thời gian chi tiết (Timeline / History Grid)
* **Giao diện:** Thiết kế dạng lưới chia theo các cột. Tên của mỗi cột tương ứng với các danh mục thông tin nhập vào (Hút sữa, Ti mẹ, Ti bình, Vệ sinh, Thể chất, Custom...).
* **Hiển thị bản ghi:** Mỗi một dữ liệu được nhập trong ngày sẽ hiển thị thành một **"Cục vuông bo tròn góc" (Card/Component nhỏ)** nằm trong cột tương ứng.
* **Thông tin trên Card:** Hiển thị rõ ràng **Giờ thực hiện** (In đậm) và các thông tin chi tiết đi kèm (Ví dụ: cột Ti Bình hiển thị card `10:30 | 120ml`).

---

### 4. Triển khai & Vận hành (Deployment & Storage)
* **Lưu trữ dữ liệu:** Dữ liệu hoàn toàn nằm trong file `server/database.sqlite`. Thêm tệp này vào `.gitignore` để không push dữ liệu thật lên Git. Quá trình backup chỉ cần copy file `.sqlite` này ra phân vùng lưu trữ khác.
* **Môi trường Production:** * `web` sẽ được build ra các file tĩnh (HTML/CSS/JS) tại thư mục `web/dist`.
    * Server Express đảm nhận nhiệm vụ serve trực tiếp thư mục `web/dist` này (`express.static`).
    * Ứng dụng chạy trên VPS bằng **1 process Node duy nhất** được quản lý và giám sát bởi **PM2**. không cần cài đặt Docker.
* **Domain & SSL:** Sử dụng **Nginx làm Reverse Proxy** đứng trước để chặn cổng, cấu hình trỏ domain và tích hợp mã hóa **SSL Certbot (Let's Encrypt)** miễn phí.
