# ADR-0002: Quản Lý Pipeline Render Bất Đồng Bộ Qua Redis Streams & WebSocket Hub

* **Trạng thái:** Accepted
* **Ngày quyết định:** 12/09/2026
* **Tác giả:** MeowShadow Core Team
* **Sprint liên quan:** Sprint 8 (SP08-01, SP08-02, SP08-03)

---

## 1. Bối cảnh (Context)
Quá trình tạo ra một bài học âm thanh 10 phút bao gồm chuỗi xử lý nặng qua nhiều giai đoạn:
1. **Phân đoạn kịch bản:** Bóc tách thẻ `[VI]`, `[EN]`, `[JA]`, gọi Ollama LLM Qwen 3 8B.
2. **Tổng hợp giọng nói đa ngữ:** Gọi TTS Engine sinh hàng chục clips audio.
3. **Mastering & Pacing:** Ghép nối khoảng lặng (1.5s VI / 3.5s EN/JA), chuẩn hóa âm lượng EBU R128 (-16 LUFS) và sinh phụ đề SRT.

Toàn bộ quá trình này mất từ 15 - 25 giây. Việc giữ kết nối HTTP đồng bộ (Synchronous Blocking HTTP) sẽ gây ra:
* Timeout kết nối trên client hoặc proxy (Cloudflare/Nginx 504 Gateway Timeout).
* Không có thông tin phản hồi trực quan về tiến độ cho người dùng.
* Lãng phí tài nguyên kết nối của server.

---

## 2. Các phương án xem xét (Options Considered)
1. **Phương án A: Polling HTTP định kỳ (`GET /api/v1/tasks/:id` mỗi 2 giây)**
   - *Ưu điểm:* Dễ triển khai ban đầu.
   - *Nhược điểm:* Gây áp lực truy vấn dồn dập vào PostgreSQL, độ trễ cập nhật trạng thái chậm từ 1 - 2 giây, không mang lại trải nghiệm mượt mà (smooth progress).
2. **Phương án B: Go State Machine + Redis Stream/PubSub + WebSocket Hub Realtime**
   - *Ưu điểm:*
     - Tách rời hoàn toàn (decoupling) giữa Go Gateway và các Python AI Workers.
     - State Machine bảo đảm tính toàn vẹn trạng thái (`PENDING -> PARSING -> SYNTHESIZING -> MASTERING -> COMPLETED / FAILED`).
     - Tự động bắt lỗi nếu bất kỳ worker nào gặp sự cố ngắt kết nối.
     - WebSocket Hub broadcast phần trăm tiến trình (15% -> 60% -> 90% -> 100%) và thời gian ước tính còn lại tới hàng nghìn client cùng lúc theo thời gian thực.
   - *Nhược điểm:* Kiến trúc phức tạp hơn, cần quản lý vòng đời kết nối socket (Ping/Pong, ReadPump, WritePump).

---

## 3. Quyết định (Decision)
**Lựa chọn Phương án B.**
* Xây dựng `RenderJob` State Machine trong Go (`internal/orchestrator/state_machine.go`) quản lý các bước chuyển trạng thái tuần tự và ngăn chặn chuyển trạng thái không hợp lệ.
* Sử dụng `internal/queue/redis_producer.go` đẩy tác vụ vào Redis Stream và Pub/Sub.
* Sử dụng `internal/orchestrator/pipeline_consumer.go` lắng nghe các sự kiện hoàn thành từng chặng từ Python Workers, cập nhật PostgreSQL và phát sóng tiến độ.
* Xây dựng WebSocket Hub đa kênh (`/ws/progress?job_id=xxx` và `/ws/lessons/:id`) tự động dọn dẹp client khi ngắt kết nối.
* Tích hợp `internal/notifications/push_dispatcher.go` gửi thông báo đẩy (FCM / APNs) tới điện thoại người dùng khi render xong.

---

## 4. Hệ quả kỹ thuật (Consequences)
* **Tích cực:**
  - Client nhận phản hồi tức thì 202 Accepted kèm `job_id`, kết nối WebSocket nhận thanh tiến trình nhảy mượt mà.
  - Xử lý bất đồng bộ triệt để, không bị crash gateway khi worker nặng tải.
* **Tiêu cực:**
  - Cần duy trì Redis 7 luôn hoạt động ổn định và cấu hình bộ nhớ Redis phù hợp với số lượng jobs hàng đợi.
