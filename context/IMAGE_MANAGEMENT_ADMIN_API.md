# Tài liệu nhanh: API Quản lý Hình ảnh (Admin)

Cập nhật theo triển khai mới nhất. Dành cho FE/Admin để tích hợp nhanh các chức năng quản lý ảnh.

- Base API prefix: `/api`
- Nhóm upload: `/api/upload`
- Swagger: `/api/docs`

## Định dạng chung
- Response phân trang: `{ data: any[], page: number, limit: number, total: number }`
- Thời gian: ISO 8601 string (VD: `2025-01-31T00:00:00.000Z`)
- Sort: chuỗi `field:direction` với `direction ∈ {asc, desc}`
- Trường sort hợp lệ: `originalFilename | savedFilename | filesize | createdAt`
- Soft-delete: xoá logic bằng `deletedAt`, ảnh đã xoá không xuất hiện trong list.

---

## 1) Tải ảnh lên
POST `/api/upload/image`

- Content-Type: `multipart/form-data`
- Field: `image` (file)

Phản hồi (UploadResponseDto):
```json
{
  "id": 1,
  "originalFilename": "cappuccino.jpg",
  "savedFilename": "1730361723-cappuccino.jpg",
  "filepath": "uploads/1730361723-cappuccino.jpg",
  "url": "http://localhost:3000/uploads/1730361723-cappuccino.jpg",
  "filesize": 245678,
  "mimetype": "image/jpeg",
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

---

## 2) Danh sách ảnh (có phân trang, tìm kiếm, lọc, sắp xếp)
GET `/api/upload/images`

Query params (tất cả đều optional):
- `page` (number, default 1)
- `limit` (number, default 24, max 100)
- `search` (string) — áp dụng cho `originalFilename`, `savedFilename`, `filepath`
- `dateFrom` (ISO string) — lọc `createdAt >= dateFrom`
- `dateTo` (ISO string) — lọc `createdAt <= dateTo`
- `sort` (string, default `createdAt:desc`) — `originalFilename|savedFilename|filesize|createdAt:asc|desc`

Ví dụ:
```
GET /api/upload/images?page=1&limit=24&search=latte&sort=createdAt:desc&dateFrom=2025-01-01&dateTo=2025-12-31
```

Phản hồi:
```json
{
  "data": [
    {
      "id": 1,
      "originalFilename": "latte.jpg",
      "savedFilename": "1730361723-latte.jpg",
      "filepath": "uploads/1730361723-latte.jpg",
      "url": "http://localhost:3000/uploads/1730361723-latte.jpg",
      "filesize": 123456,
      "mimetype": "image/jpeg",
      "createdAt": "2025-02-01T08:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 24,
  "total": 120
}
```

---

## 3) Danh sách ảnh chưa được dùng
GET `/api/upload/images/unused`

- Cùng bộ query và response như `/images` ở trên.
- Trả về ảnh không được tham chiếu bởi sản phẩm đang active (không bị soft-delete).

Ví dụ:
```
GET /api/upload/images/unused?page=1&limit=24
```

---

## 4) Xem chi tiết ảnh
GET `/api/upload/image/:id`

Phản hồi: `UploadResponseDto` như mục (1)

Lỗi 404:
```json
{
  "statusCode": 404,
  "message": "File with ID 123 not found",
  "error": "Not Found"
}
```

---

## 5) Cập nhật metadata ảnh
PATCH `/api/upload/image/:id`

Body:
```json
{ "originalFilename": "latte-updated.jpg" }
```

Phản hồi: `UploadResponseDto` sau cập nhật.

Lỗi 404 tương tự mục (4).

---

## 6) Xoá ảnh
DELETE `/api/upload/image/:id`

- Xoá file vật lý (nếu tồn tại)
- Soft-delete bản ghi (đặt `deletedAt`)

Phản hồi thành công:
```json
{ "message": "Image deleted successfully" }
```

Khi ảnh đang được sử dụng bởi sản phẩm → 409 Conflict:
```json
{
  "statusCode": 409,
  "message": "Image is referenced by 2 product(s)",
  "details": { "productIds": [1, 2] },
  "error": "Conflict"
}
```

Lỗi 404:
```json
{
  "statusCode": 404,
  "message": "File with ID 123 not found",
  "error": "Not Found"
}
```

---

## Ghi chú tích hợp FE
- Sử dụng `page/limit/total` để hiển thị phân trang; dữ liệu nằm trong `data`.
- `search` áp dụng đồng thời cho 3 trường: `originalFilename`, `savedFilename`, `filepath`.
- `dateFrom/dateTo` lọc theo `createdAt`.
- `sort` phải đúng định dạng `field:direction` (VD: `createdAt:desc`).
- Xử lý 409 khi xoá ảnh: hiển thị thông báo, có thể dẫn link sang trang chỉnh sửa sản phẩm theo `productIds`.
- `url` là đường dẫn public; có thể render trực tiếp trong UI.

