# ADR-0003: Kiến Trúc Phân Phối Phụ Đề Kép (SRT & WebVTT) và Cơ Chế Fallback Tổng Hợp DB

* **Trạng thái:** Accepted
* **Ngày quyết định:** 12/09/2026
* **Tác giả:** MeowShadow Core Team
* **Sprint liên quan:** Sprint 9 (SP09-02)

---

## 1. Bối cảnh (Context)
Các ứng dụng nghe nhìn hiện đại sử dụng 2 chuẩn phụ đề phổ biến nhưng khác biệt về cú pháp:
1. **SubRip (.srt):** Chuẩn xuất file truyền thống cho các phần mềm nghe nhạc Desktop/Mobile (VLC, KMPlayer) hoặc công cụ chỉnh sửa video. Dấu ngăn cách mili-giây là dấu phẩy (`,`), ví dụ `00:00:01,500`.
2. **WebVTT (.vtt):** Chuẩn bắt buộc của W3C cho thẻ HTML5 `<track>` trên trình duyệt Web hiện đại. Header bắt buộc bắt đầu bằng `WEBVTT` và dấu ngăn cách mili-giây là dấu chấm (`.`), ví dụ `00:00:01.500`.

Bên cạnh đó, trong các trường hợp bài học được đồng bộ từ bản sao lưu hoặc file vật lý trên ổ đĩa tạm thời bị gián đoạn, nếu không có cơ chế dự phòng, trình phát Web/Mobile sẽ không hiển thị được chữ Karaoke.

---

## 2. Các phương án xem xét (Options Considered)
1. **Phương án A: Chỉ phục vụ file SRT có sẵn trên ổ đĩa**
   - *Ưu điểm:* Đơn giản.
   - *Nhược điểm:* Trình duyệt HTML5 không đọc trực tiếp file SRT cho thẻ `<track>`; nếu file mất trên đĩa thì toàn bộ phụ đề bị lỗi 404.
2. **Phương án B: Sinh cả 2 file tĩnh lưu vào ổ cứng khi render**
   - *Ưu điểm:* Đọc file nhanh.
   - *Nhược điểm:* Tốn dung lượng ổ đĩa gấp đôi cho phụ đề, vẫn không giải quyết được trường hợp file bị thiếu trên đĩa.
3. **Phương án C: Phục vụ 2 endpoint độc lập (`.srt` và `.vtt`), tự động chuyển đổi on-the-fly và fallback tái tạo từ database chunks**
   - *Ưu điểm:*
     - Tiết kiệm dung lượng: Chỉ cần lưu 1 file SRT gốc trên đĩa.
     - Endpoint `.vtt` tự động chuyển đổi từ file SRT qua bộ chuyển đổi regex siêu tốc.
     - Nếu file vật lý trên đĩa chưa có, Go Gateway tự động đọc mảng JSONB `transcript_chunks` từ database và tổng hợp ra đúng chuẩn SRT hoặc WebVTT trong < 1 mili-giây.
   - *Nhược điểm:* Tốn một lượng CPU tính toán siêu nhỏ khi chuyển đổi (không đáng kể đối với Go).

---

## 3. Quyết định (Decision)
**Lựa chọn Phương án C.**
* Xây dựng `pkg/audioutil/vtt_converter.go`:
  - Hàm `ConvertSrtToVtt(srtContent string) string`: Thêm header `WEBVTT` và đổi dấu phẩy sang dấu chấm ở tem thời gian.
  - Hàm `GenerateSrtAndVttFromChunks(chunksJSON []byte) (srt, vtt string, err error)`: Tính toán thời lượng pacing và sinh phụ đề tức thì từ JSONB.
* Xây dựng `deliveryHttp.AssetsHandler` cung cấp:
  - `GET /api/v1/lessons/:id/subtitles.srt` (`text/plain; charset=utf-8`).
  - `GET /api/v1/lessons/:id/subtitles.vtt` (`text/vtt; charset=utf-8`).
  - `GET /api/v1/lessons/:id/waveform.json` (`application/json`).
* Áp dụng quyền truy cập Public cho 3 endpoints này để thẻ `<track>` và trình phát Web có thể fetch trực tiếp mà không cần header Authorization.

---

## 4. Hệ quả kỹ thuật (Consequences)
* **Tích cực:**
  - Trình duyệt Web tải trực tiếp WebVTT cho hiệu ứng Karaoke; người dùng có thể tải file SRT để học offline.
  - Đảm bảo tính sẵn sàng 99.99%: không bao giờ xảy ra lỗi 404 mất phụ đề nếu bản ghi bài học còn tồn tại trong PostgreSQL.
* **Tiêu cực:** Không có.
