# 🏛️ Architecture Decision Records (ADR)
## MeowShadow Lab Architecture History

Thư mục này lưu trữ các Quyết định Kiến trúc (Architectural Decision Records) được áp dụng trong quá trình phát triển hệ sinh thái MeowShadow Lab theo chuẩn [MADR (Markdown Any Decision Record)](https://adr.github.io/madr/).

Mỗi bản ADR ghi lại bối cảnh, các phương án xem xét, quyết định được lựa chọn và hệ quả kỹ thuật để đảm bảo tính nhất quán và khả năng chuyển giao của dự án.

---

## 🗂️ Danh Sách Quyết Định Kiến Trúc Đã Ban Hành

| Mã ADR | Tiêu Đề Quyết Định | Ngày Quyết Định | Trạng Thái | Sprint Áp Dụng |
| :---: | :--- | :---: | :---: | :---: |
| **[ADR-0001](./0001-golang-fiber-and-zero-copy-audio-streaming.md)** | Golang Fiber v2 & Zero-Copy HTTP Range Streaming (`io.NewSectionReader`) | 12/09/2026 | **Accepted** | Sprint 7, Sprint 9 |
| **[ADR-0002](./0002-pipeline-orchestration-via-redis-streams-and-websocket.md)** | Quản Lý Pipeline Render Bất Đồng Bộ Qua Redis Streams & WebSocket Hub | 12/09/2026 | **Accepted** | Sprint 8 |
| **[ADR-0003](./0003-subtitles-dual-format-and-dynamic-synthesis.md)** | Kiến Trúc Phân Phối Phụ Đề Kép (SRT & WebVTT) và Cơ Chế Fallback Tổng Hợp DB | 12/09/2026 | **Accepted** | Sprint 9 |
| **[ADR-0004](./0004-storage-retention-and-temporary-cleanup-policy.md)** | Chính Sách Lưu Trữ File Tạm & Worker Tự Động Dọn Dẹp Sau 24 Giờ | 12/09/2026 | **Accepted** | Sprint 9 |
| **[ADR-0005](./0005-embedded-swagger-ui-via-go-embed.md)** | Nhúng Trực Tiếp Swagger UI Qua `//go:embed` Cho Image Docker Siêu Nhẹ (< 15MB) | 12/09/2026 | **Accepted** | Sprint 9 |
