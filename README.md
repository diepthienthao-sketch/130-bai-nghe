# Tape Deck — Luyện nghe & Shadowing Tiếng Anh

Web app tĩnh (HTML/CSS/JS thuần, không cần build) để trình chiếu transcript của
39 track luyện nghe (Track 5–43, trích từ *"130 bài luyện nghe Tiếng Anh"*),
phát audio từng track từ Google Drive, cho phép highlight nội dung, và tạo
prompt để luyện nói trực tiếp với ChatGPT — dùng cho trình độ A1–A2 và B1.

**Demo trực tiếp:** sau khi bật GitHub Pages (xem bên dưới),
app sẽ chạy tại `https://<username>.github.io/<repo>/`.

## Tính năng

- **Danh sách 21 bài nghe**, tìm kiếm theo tên/số, lọc theo trình độ (A1–A2 / B1 / B1+).
- **Transcript** chia theo câu — bấm vào một câu để phóng to, hoặc bật
  **Chế độ Shadowing** để duyệt từng câu một, nghe → lặp lại → đánh dấu "đã luyện".
- **Highlight** — bôi đen bất kỳ đoạn nào trong transcript để tô màu (vàng/xanh/hồng)
  từ hoặc cụm từ khó; highlight được lưu lại trong trình duyệt (localStorage),
  không upload lên đâu cả.
- **Audio Google Drive** — mỗi track có ô nhập ID/link file Drive, phát qua
  trình phát nhúng (`drive.google.com/file/d/…/preview`). ID được lưu trong
  trình duyệt của bạn, hoặc bạn có thể gán sẵn cho tất cả mọi người dùng app
  (xem phần dưới).
- **Từ vựng & Speaking prompts** — tab riêng cho bảng từ vựng (IPA + nghĩa) và
  đề bài nói gợi ý cho A2/B1, lấy nguyên văn từ file gốc.
- **Luyện nói với AI** — tab mới tự tạo sẵn một đoạn prompt (dựa trên chủ đề,
  đề bài A2/B1 và một số từ vựng mục tiêu của track) để bạn dán vào ChatGPT
  (hoặc Claude, Gemini…) và luyện hội thoại nói trực tiếp, có sửa lỗi và gợi ý
  theo từng lượt trả lời. Bấm "Sao chép prompt" rồi dán vào ChatGPT là dùng
  được ngay.
- **Ôn từ vựng theo ngữ cảnh** — thẻ ghi nhớ (flashcard) lật để xem câu ví dụ
  thật trích từ chính bài nghe, hoặc chế độ "Điền từ vào câu" (cloze) để tự
  kiểm tra trí nhớ trước khi bấm hiện đáp án.
- **Luyện viết câu** — với mỗi từ vựng mục tiêu, bạn viết một câu đơn giản rồi
  bấm "Xem đáp án mẫu" để so sánh với câu gốc trong bài nghe (đáp án có sẵn,
  không cần chấm điểm tự động).

## Cấu trúc project

```
├── index.html      # khung giao diện
├── style.css        # giao diện "máy cassette" — không phụ thuộc framework
├── app.js           # toàn bộ logic (render, filter, highlight, shadowing, audio)
├── tracks.json       # dữ liệu 21 track: transcript, từ vựng, speaking, level
└── README.md
```

## Chạy thử ở máy local

Vì `app.js` dùng `fetch('tracks.json')`, bạn cần chạy qua một server nhỏ
(mở trực tiếp bằng `file://` sẽ bị chặn bởi CORS):

```bash
cd repo
python3 -m http.server 8000
# rồi mở http://localhost:8000
```

## Đưa lên GitHub Pages

1. Tạo repo mới trên GitHub, đẩy toàn bộ nội dung thư mục này lên nhánh `main`.
2. Vào **Settings → Pages**, chọn **Deploy from a branch**, nhánh `main`, thư mục `/ (root)`.
3. Đợi 1–2 phút, GitHub sẽ cấp link dạng `https://<username>.github.io/<repo>/`.

## Gán audio Google Drive cho từng track (khuyên dùng — làm 1 lần)

Mặc định mỗi người dùng phải tự dán link Drive cho từng track (lưu ở máy họ).
Nếu bạn muốn **mọi người mở app đã có sẵn audio luôn**, hãy điền ID file Drive
thẳng vào `tracks.json`, trường `driveFileId` của từng track:

```json
{
  "track": 5,
  "title": "Insurance.",
  ...
  "driveFileId": "1AbCdEfGhIjKlMnOpQrStUvWxYz012345"
}
```

Cách lấy ID: mở link chia sẻ file Drive dạng
`https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view`
→ ID chính là đoạn giữa `/d/` và `/view`.

Audio của cả 21 track (Track 5–25) đã được gán sẵn từ thư mục Drive của bạn
(`https://drive.google.com/drive/folders/18HR1MLSf05qvzrZdqtL78VD5RFgxjaPw`,
file đặt tên theo mẫu `Track005.mp3`…`Track025.mp3`) — mở app lên là có audio
ngay, không cần làm gì thêm. Nếu muốn đổi audio cho một track, sửa trực tiếp
`driveFileId` trong `tracks.json`, hoặc dán link mới vào ô trong app (ghi đè
tạm thời, chỉ lưu ở trình duyệt của bạn). Khung **"Duyệt thư mục Audio trên
Drive"** trong mỗi track vẫn còn để bạn tiện tra cứu/thay thế khi cần.

**Lưu ý quan trọng về Google Drive:**
- File audio phải để chế độ chia sẻ **"Anyone with the link"** thì trình phát
  nhúng mới hoạt động.
- Nếu bạn có một **thư mục Drive** chứa 21 file mp3 (đặt tên theo track, ví dụ
  `Track 5.mp3`), bạn có thể mở từng file, copy link chia sẻ, rồi dán vào ô
  "Google Drive file ID" ngay trong app (ID sẽ tự lưu ở trình duyệt của bạn),
  hoặc điền thẳng vào `tracks.json` như trên để dùng chung cho mọi người.
- Link rút gọn gốc trong file PDF (`https://byvn.net/uTwf`) trỏ tới thư mục
  Drive ở trên. App không thể tự động khớp tên file với từng track (vì Claude
  không đọc được danh sách file bên trong thư mục), nên bạn cần tự duyệt và
  gán ID — dùng khung "Duyệt thư mục Audio" ngay trong app để làm việc này
  nhanh hơn.

## Nguồn dữ liệu

Transcript, bảng từ vựng và đề bài nói được trích xuất từ 2 file người dùng
tải lên (`130 bài luyện nghe Tiếng Anh`, bản PDF chứa Track 5–25 và bản Word bổ
sung tới Track 43). Bộ tài liệu gốc có 130 bài nhưng hiện tại mới có transcript
đủ tới Track 43 — nếu bạn có thêm transcript (Track 44 trở đi), chạy lại
pipeline trích xuất (regex tách theo `Track N.`, xem qua text đã export bằng
`pandoc`/`pdftotext -layout`) và nối thêm vào `tracks.json` theo đúng cấu trúc
hiện có.

## Cấu trúc một object trong `tracks.json`

```json
{
  "track": 5,
  "title": "Insurance.",
  "paragraphs": ["...","..."],
  "sentences": ["...","..."],
  "level": "B1+",
  "wordCount": 216,
  "vocab": "A. TARGET VOCABULARY\n...",
  "speaking": "B. SPEAKING PROMPTS & HINTS\n...",
  "driveFileId": ""
}
```

`level` được gán tự động theo tỉ lệ từ dài (≥8 ký tự) trong bài — chỉ mang
tính tham khảo, bạn có thể sửa tay nếu thấy chưa hợp lý.

`vocabItems` (dùng cho tab "Ôn từ vựng" và "Luyện viết câu") được trích tự
động từ bảng từ vựng gốc và chỉ giữ lại những từ tìm được câu ví dụ khớp
trong chính transcript — vì vậy mỗi track thường chỉ có 3–11 từ (không phải
toàn bộ bảng từ vựng đầy đủ, bạn vẫn xem được đầy đủ ở tab "Từ vựng"). Track 34
hiện chưa có mục nào đạt yêu cầu này.
