# 🗄️ STORAGE: DOCKER SHARED VOLUME LƯU TRỮ MEDIA & PHỤ ĐỀ
## DỰ ÁN: MEOWSHADOW LAB (MSL-STORAGE)
### CHUẨN PHÂN CẤP LƯU TRỮ, QUYỀN TRUY CẬP CÁC CONTAINER & CHÍNH SÁCH DỌN DẸP FILE TẠM

---

Thư mục `storage/` được gắn trực tiếp (Bind Mount / Docker Shared Volume `storage-data`) vào các container:
* `services/gateway-core`: Gắn tại `/app/storage` (Quyền: Đọc Audio & Subtitles để stream cho Client, Xóa khi xóa bài học).
* `services/tts-engine`: Gắn tại `/app/storage` (Quyền: Đọc/Ghi vào `cache/`).
* `services/audio-processor`: Gắn tại `/app/storage` (Quyền: Đọc `cache/` & `cues/`, Ghi vào `audio/`, `subtitles/` & `temp/`).

---

## 📁 CẤU TRÚC PHÂN CẤP THƯ MỤC

```text
storage/
├── README.md               # Cẩm nang kỹ thuật lưu trữ
├── audio/                  # File âm thanh bài học 10 phút hoàn chỉnh (VD: lesson_8a7d3b.mp3)
├── subtitles/              # File phụ đề đồng bộ theo thời gian thực (VD: lesson_8a7d3b.srt, .vtt)
├── cache/                  # Cache các câu thoại ngắn băm theo mã MD5 (VD: 9a8b7c6d5e4f.mp3)
├── cues/                   # Hiệu ứng âm thanh thông báo chuyển câu (VD: chime.mp3, bell.wav)
└── temp/                   # Thư mục làm việc tạm thời cho FFmpeg (tự động xóa sau khi render)
```

---

## 🛡️ PHÂN QUYỀN TRUY CẬP (ACCESS CONTROL MATRIX)

| Container | `audio/` | `subtitles/` | `cache/` | `cues/` | `temp/` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`gateway-core`** | Đọc & Xóa | Đọc & Xóa | - | - | - |
| **`tts-engine`** | - | - | Đọc & Ghi | - | - |
| **`audio-processor`**| Ghi | Ghi | Đọc | Đọc | Đọc, Ghi & Dọn dẹp |

---

## 🧹 CHÍNH SÁCH DỌN DẸP FILE RÁC (CLEANUP POLICY & ADR-0004)

1. **Thư mục `temp/`:**
   - Worker `audio-processor` tự động xóa các file WAV trung gian ngay sau khi lệnh FFmpeg concat & loudnorm kết thúc.
   - **Tự động dọn dẹp định kỳ (Storage Retention):** Background Worker `StorageCleanupService` trong `gateway-core` tự động quét thư mục `storage/temp/` mỗi 1 giờ và xóa vĩnh viễn các file tạm có thời gian chỉnh sửa quá 24 giờ ([ADR-0004](../docs/adr/0004-storage-retention-and-temporary-cleanup-policy.md)).
   - Khi chạy `make clean` hoặc `scripts/clean.sh`, toàn bộ file trong `temp/` sẽ được dọn dẹp lập tức.
2. **Thư mục `cache/`:**
   - Được bảo lưu để tối ưu hóa thời gian sinh âm thanh cho các bài học tiếp theo (Smart MD5 cache).
   - Khi dung lượng ổ đĩa vượt quá 80%, script bảo trì sẽ xóa các file cache có thời gian truy cập (`atime`) lâu hơn 30 ngày.
3. **Thư mục `audio/` & `subtitles/`:**
   - Chỉ bị xóa khi người dùng thực hiện hành động xóa bài học tương ứng trên giao diện (`DELETE /api/v1/lessons/{id}`).
