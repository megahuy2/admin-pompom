# PomPom Admin Web — Kế hoạch triển khai

> File này dùng làm "bộ nhớ ngoài" cho Claude Code. Mỗi khi bắt đầu phiên làm việc mới,
> dán nội dung file này vào đầu để Claude Code hiểu toàn cảnh dự án.

## Bối cảnh

- Đồ án môn học UEL (252BIE503101), nhóm 6.
- App di động PomPom: thương mại điện tử mỹ phẩm + AI (Dermatologist, Makeup Artist,
  Client Advisor, Chatbot) + cộng đồng + hội viên.
- Đây là **web admin** để vận hành nền tảng (KHÔNG phải app di động): quản lý sản phẩm,
  đơn hàng, người dùng, nội dung cộng đồng.
- Database: MongoDB (Compass để xem trực quan). ERD gốc là SQL (35 bảng, 8 domain,
  48 quan hệ theo "Bảng 3.7") — đã được dịch sang 35 Mongoose schema, giữ nguyên cấu trúc
  collection riêng biệt (không gộp/embed) để bám sát ERD đã nộp.
- Backend: Node.js + Express + Mongoose.
- Frontend: Angular + TypeScript.

## Quy tắc bắt buộc (rút từ kinh nghiệm làm ERD/báo cáo trước đó)

1. **Tuyệt đối không tự suy diễn** field/quan hệ ngoài những gì đã có trong:
   - `backend/models/*.models.js` (35 schema đã chốt)
   - `idea.md` (tài liệu mô tả nghiệp vụ)
2. Khi cần thêm field/logic mới ngoài 2 nguồn trên, **hỏi lại trước khi code**, không tự quyết định.
3. Mỗi domain làm xong phải test thử bằng `curl`/Postman trước khi sang domain tiếp theo.
4. Soft-delete (set `is_active=false` hoặc tương đương) thay vì xóa cứng, trừ khi được yêu cầu khác.

## Tiến độ

### ✅ Đã hoàn thành
- [x] 35 Mongoose schema (8 file theo domain, gom tại `models/index.js`)
- [x] Script import Excel → MongoDB (`scripts/excel_to_json.py` + `scripts/importExcelData.js`)
- [x] Auth: login admin (JWT) + middleware `verifyToken`/`requireAdmin`
- [x] Domain **Product**: CRUD đầy đủ (`controllers/product.controller.js`, `routes/product.routes.js`)

### ⬜ Cần làm tiếp (theo thứ tự ưu tiên)

**Bước A — Domain Order** (backend)
- [ ] `controllers/order.controller.js`: list (filter theo status/ngày), detail, update status
      (kèm tự động ghi `order_status_history`), xác nhận thanh toán COD
- [ ] `routes/order.routes.js`
- [ ] Đăng ký route vào `server.js`

**Bước B — Domain User** (backend)
- [ ] `controllers/user.controller.js`: list (search theo tên/email), detail (kèm địa chỉ,
      lịch sử đơn hàng), khóa/mở khóa tài khoản (`status`), gửi thông báo (tạo `Notification`)
- [ ] `routes/user.routes.js`

**Bước C — Domain Community** (backend)
- [ ] `controllers/community.controller.js`: list bài viết chờ duyệt (`is_hidden=true`),
      duyệt/ẩn bài, xem comments
- [ ] `routes/community.routes.js`

**Bước D — Angular Admin Web** (frontend, khởi tạo sau khi backend domain A-C xong)
- [ ] `ng new admin-web --routing --style=scss`
- [ ] Cài Angular Material hoặc PrimeNG
- [ ] `core/services/auth.service.ts` + `AuthGuard` + `HttpInterceptor` (gắn Bearer token)
- [ ] `features/products/` — list (table + filter), form tạo/sửa
- [ ] `features/orders/` — list, detail, đổi trạng thái
- [ ] `features/users/` — list, detail, khóa/mở khóa
- [ ] `features/community/` — duyệt bài viết

## Cấu trúc thư mục hiện tại

```
pompom-admin/
└── backend/
    ├── config/db.js
    ├── middleware/auth.middleware.js
    ├── models/
    │   ├── user.models.js          (User, GuestSession, UserAddress)
    │   ├── product.models.js       (Category, Product, ProductImage, ProductVariant)
    │   ├── promotion.models.js     (Voucher, UserVoucher, Promotion, PromotionDetail)
    │   ├── order.models.js         (Cart, CartItem, Order, OrderItem, OrderStatusHistory, Payment)
    │   ├── engagement.models.js    (Wishlist, ProductReview, Notification, Banner, SearchHistory, RecentlyViewed)
    │   ├── community.models.js     (CommunityPost, Comment, Like, Follow)
    │   ├── ai.models.js            (AiSession, AiDermatologist, AiMakeupArtist, AiClientAdvisor, ChatbotConversation, ChatbotMessage)
    │   ├── membership.models.js    (MembershipHistory, PointsTransaction)
    │   └── index.js                (gom tất cả)
    ├── controllers/
    │   ├── auth.controller.js
    │   └── product.controller.js
    ├── routes/
    │   ├── auth.routes.js
    │   └── product.routes.js
    ├── scripts/
    │   ├── excel_to_json.py
    │   └── importExcelData.js
    ├── server.js
    ├── package.json
    ├── .env.example
    └── README.md
```
