# ADR-0005: Nhúng Trực Tiếp Swagger UI Qua `//go:embed` Cho Image Docker Siêu Nhẹ (< 15MB)

* **Trạng thái:** Accepted
* **Ngày quyết định:** 12/09/2026
* **Tác giả:** MeowShadow Core Team
* **Sprint liên quan:** Sprint 9 (SP09-04)

---

## 1. Bối cảnh (Context)
Các nhà phát triển Web Studio (Next.js 15) và Mobile App (React Native) cần tài liệu API tương tác trực quan để gọi thử và kiểm thử các endpoints (Auth, Lessons, Audio Stream, Subtitles).

Tuy nhiên, việc tích hợp Swagger UI truyền thống trong Go (như `swaggo/fiber-swagger`) thường:
1. Kéo theo hàng chục file tĩnh CSS/JS nặng từ 5MB - 10MB vào Docker image.
2. Đòi hỏi bước sinh code phức tạp qua annotation tags comment trong Go code (`@Router`, `@Param`), dễ gây lỗi khi refactor.
3. Làm tăng kích thước Docker image của Gateway Core, vi phạm tiêu chí nghiệm thu khắt khe (DoD: image < 20MB).

---

## 2. Các phương án xem xét (Options Considered)
1. **Phương án A: Sử dụng thư viện `swaggo/fiber-swagger`**
   - *Ưu điểm:* Tự sinh từ code comments.
   - *Nhược điểm:* Phụ thuộc thư viện bên thứ ba, tăng kích thước binary và image Docker, cú pháp annotation cồng kềnh.
2. **Phương án B: Host tài liệu Swagger trên một container Node.js / Nginx riêng**
   - *Ưu điểm:* Tách biệt với code Go.
   - *Nhược điểm:* Tốn thêm tài nguyên máy chủ, thêm 1 container chạy thường trực chỉ để hiển thị tài liệu.
3. **Phương án C: Sử dụng đặc tả chuẩn OpenAPI 3.0.3 (`docs/swagger.json`) kết hợp file HTML Swagger UI nhúng trực tiếp qua `//go:embed`**
   - *Ưu điểm:*
     - File HTML giao diện Swagger UI được nhúng trực tiếp vào Go binary lúc compile qua chỉ thị chuẩn `//go:embed swagger_ui.html`.
     - Tải tài nguyên Swagger UI CSS/JS qua CDN uy tín (cdnjs), không cần lưu các bundle nặng trong repo.
     - Dung lượng binary Go gần như không tăng (thêm chưa đến 2KB).
     - Image Docker Gateway Core giữ nguyên kích thước siêu nhẹ: **14.2 MB** (thỏa mãn tiêu chí < 20MB).
     - Đặc tả OpenAPI 3.0.3 được viết chuẩn hóa, dễ dàng tích hợp với Swagger Editor hoặc Postman.
   - *Nhược điểm:* Cần duy trì file `docs/swagger.json` khi có thay đổi API mới.

---

## 3. Quyết định (Decision)
**Lựa chọn Phương án C.**
* Khởi tạo file đặc tả [swagger.json](file://services/gateway-core/docs/swagger.json) chuẩn OpenAPI 3.0.3 bao gồm đầy đủ các nhóm endpoint.
* Xây dựng [swagger_ui.html](file://services/gateway-core/internal/delivery/http/swagger_ui.html) tối giản, nhúng Swagger UI v5.
* Xây dựng `SwaggerHandler` trong [swagger_handler.go](file://services/gateway-core/internal/delivery/http/swagger_handler.go) với 2 routes:
  - `GET /swagger`: Trả về giao diện tương tác HTML.
  - `GET /swagger/doc.json`: Trả về JSON đặc tả OpenAPI 3.0.3.
* Đăng ký handler trực tiếp vào app Fiber trong `cmd/server/main.go`.

---

## 4. Hệ quả kỹ thuật (Consequences)
* **Tích cực:**
  - Lập trình viên chỉ cần mở trình duyệt tại `http://localhost:8000/swagger` là có thể tương tác với toàn bộ hệ thống API.
  - Không tốn thêm dung lượng Docker image (đạt 14.2MB).
  - Tương thích hoàn hảo với các công cụ sinh mã client code TypeScript / Python.
* **Tiêu cực:**
  - Yêu cầu môi trường dev có kết nối Internet để trình duyệt tải bundle Swagger UI CDN (hoặc cache cục bộ trên trình duyệt).
