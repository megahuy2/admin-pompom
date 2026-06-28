# PomPom Admin — Backend

Backend Node.js + Express + MongoDB (Mongoose) cho web admin quản lý PomPom.
35 collection MongoDB, bám đúng ERD đã chốt (8 domain, 48 quan hệ theo Bảng 3.7).

## 1. Cài đặt

```bash
cd backend
npm install
```

> Lưu ý: dùng `bcryptjs` (pure JS) thay vì `bcrypt` để tránh lỗi compile native trên một số máy Windows/thiếu build tools.

## 2. Cấu hình môi trường

```bash
cp .env.example .env
```

Mở `.env`, đảm bảo `MONGO_URI` khớp với connection string bạn dùng trong Compass. Mặc định:

```
MONGO_URI=mongodb://localhost:27017/pompom
```

Nếu Compass đang kết nối tới `localhost:27017` (mặc định khi cài MongoDB Community), không cần đổi gì.

## 3. Import dữ liệu mẫu từ Excel vào MongoDB

Bước 1 — Convert Excel sang JSON sạch (chỉ cần chạy lại khi file Excel gốc thay đổi):

```bash
python3 scripts/excel_to_json.py "đường-dẫn-tới/Data_PomPom.xlsx"
```

Cần có `pandas` và `openpyxl`:
```bash
pip install pandas openpyxl
```

Bước 2 — Import JSON vào MongoDB (script sẽ XÓA toàn bộ data cũ trong các collection trước khi import lại, để chạy lại nhiều lần an toàn):

```bash
npm run import-data
```

Sau khi chạy xong, mở Compass, kết nối `mongodb://localhost:27017`, bạn sẽ thấy database `pompom` với 35 collection đã có dữ liệu.

## 4. Chạy server

```bash
npm run dev
```

Server chạy tại `http://localhost:5000`. Test thử:

```bash
curl http://localhost:5000/
# {"message":"PomPom Admin API đang chạy"}
```

## 5. Tạo tài khoản Admin đầu tiên để login

Vì web admin yêu cầu `role: 'admin'`, nhưng data mẫu từ Excel hầu hết là `role: 'user'`
(chỉ có 1 dòng admin mẫu, password chưa hash đúng chuẩn). Cách nhanh nhất để có tài khoản admin
dùng được ngay: mở Compass → collection `users` → sửa 1 document bất kỳ:
- `role`: `"admin"`
- `password_hash`: thay bằng hash bcrypt thật của 1 mật khẩu bạn chọn

Hoặc chạy script nhỏ này (tạo thêm 1 admin mới, không đụng data cũ):

```bash
node -e "
require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const { User } = require('./models');
(async () => {
  await connectDB();
  const hash = await bcrypt.hash('admin123', 10);
  await User.create({
    full_name: 'Admin PomPom',
    email: 'admin@pompom.com',
    password_hash: hash,
    role: 'admin',
    status: 'active'
  });
  console.log('Đã tạo admin: admin@pompom.com / admin123');
  process.exit(0);
})();
"
```

## 6. Cấu trúc API hiện có

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/auth/login` | Đăng nhập admin, trả về JWT |
| GET | `/api/auth/me` | Lấy thông tin admin hiện tại (cần Bearer token) |
| GET | `/api/products` | Danh sách sản phẩm (phân trang, filter, search) |
| GET | `/api/products/:id` | Chi tiết sản phẩm (kèm images + variants) |
| POST | `/api/products` | Tạo sản phẩm mới |
| PUT | `/api/products/:id` | Cập nhật sản phẩm |
| DELETE | `/api/products/:id` | Soft-delete (set `is_active=false`) |
| GET | `/api/products/categories` | Danh sách danh mục (dùng cho dropdown) |

Tất cả route `/api/products/*` yêu cầu header:
```
Authorization: Bearer <token-từ-login>
```

## 7. Bước tiếp theo (gợi ý cho Claude Code)

Domain `products` đã hoàn chỉnh, dùng làm mẫu để tạo tương tự cho:
- `orders` (orders, order_items, order_status_history, payments)
- `users` (users, user_addresses, vouchers)
- `community` (community_posts, comments, likes, follows — có duyệt bài: `is_hidden`)

Pattern lặp lại cho mỗi domain: 1 file `controller`, 1 file `routes`, đăng ký vào `server.js`.
