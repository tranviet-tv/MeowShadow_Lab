# ADR-0004: Chính Sách Lưu Trữ File Tạm & Worker Tự Động Dọn Dẹp Sau 24 Giờ

* **Trạng thái:** Accepted
* **Ngày quyết định:** 12/09/2026
* **Tác giả:** MeowShadow Core Team
* **Sprint liên quan:** Sprint 9 (SP09-03)

---

## 1. Bối cảnh (Context)
Trong quá trình xử lý audio của hệ sinh thái MeowShadow Lab, các worker liên tục tạo ra các file trung gian:
* Các đoạn audio lẻ WAV/MP3 từ TTS Engine (`storage/temp/`).
* Các file audio sau khi chèn khoảng lặng trước khi ghép nối hoàn chỉnh.
* Các file tạm thời của các bài học bị hủy giữa chừng hoặc gặp lỗi.

Nếu không có cơ chế tự động dọn dẹp, ổ cứng máy chủ (hoặc Docker persistent volume) sẽ nhanh chóng bị tràn dung lượng (Disk Full Out of Space), làm tê liệt toàn bộ hệ thống.

---

## 2. Các phương án xem xét (Options Considered)
1. **Phương án A: Sử dụng Cronjob ngoài hệ thống máy chủ (Host OS Cron)**
   - *Ưu điểm:* Độc lập với ứng dụng.
   - *Nhược điểm:* Vi phạm nguyên tắc 100% Docker-First (phụ thuộc vào hệ điều hành host), khó viết unit test và không thu thập được số liệu giám sát (metrics) vào Gateway Core.
2. **Phương án B: Xóa ngay lập tức file tạm sau khi render xong từng bài**
   - *Ưu điểm:* Giải phóng dung lượng ngay.
   - *Nhược điểm:* Nếu quá trình render bị lỗi ở khâu cuối (ví dụ khâu sinh SRT hoặc xuất MP3), không thể tái sử dụng các clip TTS đã sinh ra trước đó để retry, gây lãng phí chi phí AI và thời gian.
3. **Phương án C: Background Cleanup Worker tích hợp sẵn trong Gateway Core với thời gian lưu giữ (Retention Window) là 24 giờ**
   - *Ưu điểm:*
     - Khép kín 100% trong Docker container, không phụ thuộc host cron.
     - Cho phép tái sử dụng các file tạm trong vòng 24 giờ nếu cần debug hoặc retry tác vụ.
     - Tự động chạy nền mỗi 1 giờ, bảo toàn an toàn các file mới tạo (< 24h) và xóa sạch các file rác cũ (> 24h).
     - Cung cấp chế độ DryRun và ghi nhận metrics: số file quét, số file xóa, dung lượng giải phóng.
   - *Nhược điểm:* Cần quản lý context hủy goroutine khi tắt server (Graceful Shutdown).

---

## 3. Quyết định (Decision)
**Lựa chọn Phương án C.**
* Xây dựng `internal/services/storage_cleanup.go` triển khai interface `StorageCleanupService`.
* Cấu hình mặc định:
  - `StorageDir`: Đường dẫn thư mục lưu trữ (`./storage` hoặc `/app/storage`).
  - `RetentionDuration`: 24 giờ (`24 * time.Hour`).
  - `Scheduler Interval`: Quét định kỳ mỗi 1 giờ.
* Chỉ quét và dọn dẹp thư mục con `storage/temp/`; tuyệt đối không can thiệp vào các thư mục chứa dữ liệu chính thức như `storage/audio/` hay `storage/subtitles/`.
* Tích hợp `StartScheduler` vào `cmd/server/main.go` và hủy context khi nhận tín hiệu kết thúc OS (SIGTERM/SIGINT).

---

## 4. Hệ quả kỹ thuật (Consequences)
* **Tích cực:**
  - Ổ đĩa server luôn sạch sẽ, không bao giờ bị tràn dung lượng bởi file tạm.
  - Hoàn toàn tự động, có log báo cáo dung lượng đã giải phóng rõ ràng.
* **Tiêu cực:**
  - Cần bảo đảm timestamp của file hệ thống trong container (`os.Chtimes` / `ModTime`) đồng bộ với giờ hệ thống thực tế.
