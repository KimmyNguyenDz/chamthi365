# Chamthi365 — Design Doc

Ngày: 2026-11-23 · Trạng thái: chờ duyệt

## 1. Mục đích & lý do

Chamthi365 là bản clone chức năng 100% của app PWA **Chấm Phiếu Học Giỏi**
(`champhieu.hoc-gioi.pages.dev`, tác giả Thầy Thái Minh Nguyên) — app chấm phiếu
trắc nghiệm bằng camera điện thoại cho giáo viên Việt Nam — đổi tên thương hiệu
thành **Chamthi365**, bổ sung tính năng mới: **quét/nhận diện mã QR**.

Người dùng: giáo viên. Bối cảnh: chấm bài kiểm tra trắc nghiệm hàng loạt bằng
điện thoại/máy tính có camera, không cần máy quét chuyên dụng.

## 2. Goals / Non-goals / Anti-goals

**Goals**
- Đầy đủ chức năng của app gốc (mục 4) chạy trên React + Vite PWA, offline-first.
- Engine OMR tự viết trong Web Worker, đọc được các mẫu phiếu trong thư viện
  (mirror toàn bộ dữ liệu `/thu-vien/` của app gốc: mục lục, khuôn JSON, ảnh
  preview, PDF in).
- Đồng bộ tài khoản: Supabase (auth Google + Postgres) và upload ảnh phiếu lên
  Google Drive — cấu hình bằng project/keys riêng của chủ Chamthi365.
- Tính năng QR mới (mục 7).
- Đổi thương hiệu: tên "Chamthi365", màu/logo/asset mới (không dùng logo,
  tên tác giả, domain của app gốc trong UI).

**Non-goals**
- Không sao chép nguyên văn code minified (không thể và không cần) — viết lại
  sạch theo đúng spec hành vi.
- Không giữ credit/tên tác giả gốc trong UI.
- Không cần giống pixel-perfect 100% giao diện; giống luồng + chức năng +
  phong cách (fonts, bảng màu cartoon, nút bo viền đậm).

**Anti-goals**
- Bắt người dùng tạo tài khoản mới dùng được (app gốc cho chấm offline không
  cần đăng nhập — giữ nguyên).
- Server riêng ngoài Supabase/Drive (không backend tự host).

## 3. Ràng buộc

- Camera chỉ hoạt động trên HTTPS (hoặc localhost).
- Dữ liệu thư viện phiếu mirror từ `champhieu.hoc-gioi.pages.dev/thu-vien/`
  vào `public/thu-vien/` (user đã chọn phương án mirror).
- Supabase keys do user cung cấp; code đọc từ `.env` (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID` nếu tách). Chưa có keys thì
  app vẫn chạy đầy đủ offline, nút đăng nhập hiện trạng thái "chưa cấu hình".
- Windows dev env, Node 24, pnpm/npm.

## 4. Bản đồ chức năng (spec hành vi từ app gốc)

### 4.1 Màn chào + Onboarding
- Splash: nền gradient sky, đồi parallax, logo, "Chào mừng quý thầy cô",
  progress bar; tắt sau ≥1.7s hoặc bỏ nếu `cp-khong-chao=1` /
  `prefers-reduced-motion`.
- Onboarding card-carousel ở lần đầu: 5 bước quy trình + "Xem các nút" (tour
  các nút trang chủ) + thử bài mẫu.

### 4.2 Trang chủ (`#/`)
- Lời chào theo thứ/ngày, nút "?" mở lại hướng dẫn.
- Thẻ "Bài gần nhất" + list bài chấm (tên, số phiếu đã chấm, điểm TB, cảnh báo
  phiếu lỗi/cần xem, "Chấm tiếp").
- Nút: Tạo bài chấm · Trộn đề Word · Danh sách (nạp Excel lớp) · In phiếu
  (thư viện) · Chấm PDF · Đăng nhập/tài khoản.

### 4.3 Tạo/Sửa bài chấm (`#/tao`, `#/bai/:id/sua`)
- Wizard 3 bước: (1) chọn mẫu phiếu — lọc theo họ, số câu, phách, SBD; nút
  **Quét phiếu** chụp 1 tờ → worker `nhan-dang` gợi ý đúng mẫu; (2) thông tin &
  điểm — tên bài, môn preset (Toán/Hoá/…, thêm môn), bật/tắt đọc SBD, số câu
  dùng thật ≤ số câu in, cách tính điểm; (3) danh sách học sinh.
- Preset tính điểm (đã giải mã):
  - `toan-2025`: p1=0.25/câu, p2=[0,.1,.25,.5,1] theo số ý đúng, p3=0.5/câu,
    lamTron .05, boSo0Sau, nhanPhayDau
  - `mon-khac-2025`: giống trên nhưng p3=0.25
  - `giua-ki`: p1 tổng 3đ, p3 tổng 2đ, tuLuan 2đ, lamTron .25
  - `trac-nghiem-10`: thang 10 chia đều p1, p3=0.25, lamTron .01
  - `hsg`: p1=0.5, p2 steps .25, p3=1, truP1=0.25 (trừ mỗi câu sai)
  - Custom: chỉnh điểm/câu từng phần, tự luận tối đa, trừ điểm, làm tròn
    (0/.01/.05/.25/.5), boSo0Sau, nhanPhayDau.
- Không đổi mẫu phiếu sau khi đã chấm ≥1 phiếu.

### 4.4 Đáp án (`#/bai/:id/dap-an`)
- Nhiều mã đề, mỗi mã: p1 (A/B/C/D, nhiều đáp án ghi liền "AB", `*` huỷ),
  p2 (chuỗi Đ/S 4 ký tự/câu, `*` huỷ), p3 (đáp số; nhiều đáp số `0,5/1`; `*` huỷ).
- Nhập: gõ tay (keyboard tự nhảy câu/ý, mũi tên di chuyển), dán chuỗi, nạp
  Excel (đọc khuôn "Đề \ Câu" + cột 1..n + 1a..d cho p2), tương thích tệp của
  app QM; tải Excel mẫu đúng số câu; tải Excel các mã đang có; cảnh báo mã đề
  trùng đáp án toàn bộ P1.
- **MỚI: QR đáp án** — xem mục 7.

### 4.5 Chấm bằng camera (`#/bai/:id/camera`)
- Live preview + worker `ngam` phân tích từng frame: tìm 4 ô vuông đen góc →
  hướng dẫn ("Đưa cả phiếu vào", "Phiếu hơi nhỏ", "Ảnh đang nhòe", "Thấy đủ
  N ô mốc · giữ yên…") → khi ổn định tự chụp → worker `may-cham` chấm.
- Tuỳ chọn: tự chụp (độ nhạy: nhanh/chắc chắn), hiện kết quả sau mỗi phiếu,
  âm báo bíp, rung, TTS đọc tên+điểm, đèn pin (torch), chế độ giá đỡ vs cầm
  tay, khung hình: thấy trọn vs phủ kín, toàn màn hình.
- Sau chấm: phiếu vừa chấm (SBD→tên, mã đề, điểm, số chỗ cần xem), hàng đợi
  "cần xem", cảnh báo SBD trùng, "Chấm lại thay kết quả cũ", kiểm 3 khung hình
  khớp nhau.
- Bài chưa có đáp án vẫn chấm được (lưu bài làm, có đáp án thì tính điểm sau).

### 4.6 Chấm từ tệp (`#/bai/:id/cham`)
- Nhiều ảnh một lúc; PDF máy scan — render từng trang bằng PDF.js, tự tách 2
  phiếu/trang; hàng đợi tiến độ, ảnh lỗi chụp lại.

### 4.7 Xem phiếu (`#/bai/:id/phieu/:pid`)
- Ảnh phiếu + lớp phủ màu: xanh=tô đúng, cam=cần xem (tô mờ/vết tẩy/tô 2 ô/
  SBD trùng/câu thừa), vùng xám=câu không dùng; phóng to, so với ảnh gốc
  (giữ để xem), thanh chia so sánh.
- Bấm ô để sửa tay (chọn đáp án, nhiều ô "AB", bỏ trống, bỏ sửa tay), sửa SBD
  (gợi ý học sinh khớp), chọn mã đề (sáng=khớp phần đã tô), nhập điểm tự luận.
- Xoá phiếu; điều hướng phiếu trước/sau.

### 4.8 Kết quả (`#/bai/:id`, `#/bai/:id/xem`)
- Bảng điểm từng em (SBD, tên, mã đề, điểm từng phần, tổng); thống kê TB /
  trung vị / ≥ X / cao-thấp; thống kê theo câu (nhiều em sai); lọc mã đề, sắp
  điểm; cờ "cần xem", SBD không có trong DS, chưa có đáp án; xuất Excel bảng
  điểm chi tiết (SBD, tên, mã, P1.x, P2.x, P3.x, tổng).

### 4.9 Danh sách học sinh (`#/bai/:id/hoc-sinh`)
- Nạp Excel cột SBD + Họ và tên (+Lớp); hiện em chưa có bài; ghép theo SBD.

### 4.10 Thư viện phiếu (`#/phieu`)
- 819 mẫu: lọc họ/từ (QM·Mới·Trường), số câu, phách; preview webp; tải PDF in;
  hướng dẫn in đúng 100% A4.
- Mẫu phiếu QR mới của Chamthi365 (mục 7.1).

### 4.11 Trộn đề Word (`#/tron`)
- Nạp .docx (reject .doc); parse OOXML: paragraphs, runs (bold/underline/
  color), bảng, hình, OMML/MathType OLE, numbering.
- Nhận dạng: câu "Câu N." / "Question N." / auto-numbering; phương án "A." "B."
  (nhiều phương án/dòng cách Tab, `<*A>` ghim vị trí); đáp án đúng = gạch chân
  hoặc tô đỏ chữ cái, hoặc từ lời giải; ý Đ/S "a)" "b)"; đáp số sau "Đáp số:";
  phần "PHẦN I/II/III/IV"; thẻ nhóm `<g0..g3>` `<#g…>`; lời giải "Lời giải"
  bỏ khỏi đề; tách bản lời giải cuối tệp.
- Trộn: số đề N, mã đầu + tăng dần hoặc tự gõ; trộn câu/phương án theo cờ
  nhóm; cân đối ABCD; trộn ý Phần II (tuỳ chọn); nhãn câu bắt đầu từ N.
- Trình bày: giữ gốc hoặc chuẩn đề thi — font Times New Roman, giãn dòng,
  không cắt câu sang trang, căn giữa hình, chân trang "Trang 1/4 - Mã đề 101",
  chèn tiêu đề kiểu đề quốc gia (SỞ/Phòng GD, kì thi, năm học, môn, thời
  gian, "Đề thi có N trang", dòng thí sinh/SBD, MÃ ĐỀ), ghi chú cuối đề.
- Xuất ZIP: docx từng mã + bảng đáp án docx + đáp án xlsx khuôn QM (nạp được
  vào app); nút "Tạo bài chấm từ đề này" / "Thêm đáp án vào bài có sẵn".

### 4.12 Tài khoản & đồng bộ
- Đăng nhập Google qua Supabase OAuth (`drive.file` scope); bảng `cp_bai`,
  `cp_phieu` (id, data jsonb, xoa, cap_nhat) — sync tăng dần theo `cap_nhat`,
  queue `hang` khi offline, conflict: bản mới nhất thắng.
- Ảnh phiếu đã chấm (có lớp chấm) upload multipart vào thư mục Drive riêng
  của app (15GB miễn phí); token provider ~1h hết hạn → nút "Kết nối lại";
  link mở thư mục Drive.

### 4.13 PWA & demo
- Manifest, SW workbox precache, hướng dẫn cài đặt theo từng trình duyệt
  (Android/iOS/Zalo-FB-in-app), cảnh báo cần HTTPS.
- Bài mẫu: bài chấm demo có sẵn 4 mã đề + danh sách lớp + ảnh phiếu mẫu
  (trình chiếu trên màn hình để điện thoại quét thử).

## 5. Kiến trúc kỹ thuật

**Stack**: React 18 + TypeScript + Vite + `vite-plugin-pwa` (Workbox). Router
hash (giống gốc) tự viết nhẹ. UI: CSS thuần theo design tokens app gốc
(fonts Baloo 2 + Be Vietnam Pro, palette `#7ccfff`/`#ffcf3f`/`#36c46b`/
`#1f2544`, nút bo viền 3px đổ bóng cứng). Icons `lucide-react`.

**Thư viện**: `idb` (IndexedDB), `xlsx` (SheetJS) — Excel đọc/ghi, `pdfjs-dist`
— chấm PDF/preview, `jszip` — trộn đề output + đọc docx, `jsqr` + native
`BarcodeDetector` — đọc QR, `qrcode` — sinh QR, `@supabase/supabase-js`.

**Workers** (`src/workers/`):
- `ngam.worker.ts` — loop `requestVideoFrameCallback`/interval: gray →
  normalize → downscale → tìm marker → trả trạng thái khung hình + ổn định.
- `may-cham.worker.ts` — pipeline chấm 1 ảnh: gray (`Yt`) → chuẩn hoá nền
  (`Kt`, grid 16px, percentile 5%, dilate ×2, mean, clamp 40) → downscale
  (`Zt`) → connected-components union-find tìm blob đen (`en`) → lọc marker
  (kích thước, tỉ lệ, ring trắng `nn`) → chọn 4 góc khớp tỉ lệ `trang`/`goc`
  → bản đồ projective → mẫu từng ô (fill fraction trong bán kính `rk`) →
  ngưỡng thích ứng/hysteresis → SBD, mã đề, p1/p2/p3, cờ vết tẩy/chưa chắc →
  QR decode (mới, mục 7) → trả kết quả + ảnh warped + overlay geometry.
- `nhan-dang.worker.ts` — thử mọi khuôn chạy pipeline phát hiện marker, chấm
  điểm khớp hình học để gợi ý mẫu phiếu.

**Data model** (IndexedDB `chamthi365`, giữ nguyên schema gốc để tương thích):
- `bai`: `{id, ten, mon, lop[], phieu(ma mẫu), khuon(id khuôn), diem{mau,
  soCau{p1,p2,p3}, p1, p2[], p3, tuLuan, truP1, lamTron, boSo0Sau, nhanPhayDau},
  dapAn[{ma, p1[], p2[], p3[]}], hocSinh[{sbd, ten, lop?}], tao, sua}`
- `phieu`: `{id, baiId, stt, nguon(camera|tep), luc, ok, kq{kết quả worker:
  doc{sbd, ma, maNguon, p1[], p2[][], p3[], khac[]}, can[], overlay...},
  sua{}, loi?}` — **mỗi lần quét = 1 record**. Session dùng đúng 1 khuôn
  (`khuon[0]` của mẫu); mẫu nhiều trang (`khuon[]` có `trang`/`clip`) chỉ phục
  vụ tách trang khi chấm PDF và nhận dạng — trang tự luận không chấm OMR,
  điểm tự luận nhập tay. Cột `khac` = ô STT/ô ghi điểm: đọc để hiển thị
  nhãn phiếu, không tính điểm.
- `anh`: `{khoa, blob}`; `hang`: queue đồng bộ `{loai, id, baiId, luc}`;
  `meta`: key-value (`moc:*`, settings, onboarding flags).

**Module**: `src/lib/` (db, scoring `cham`, xlsx io, drive, supabase sync,
docx/, omr shared), `src/components/`, `src/screens/` theo routes,
`src/workers/`, `public/thu-vien/` (mirror), `public/` assets mới.

## 6. Approaches đã cân nhắc

| Quyết định | Chọn | Loại |
|---|---|---|
| Stack | React+Vite+TS PWA (giống gốc — tương thích PWA/offline/worker) | Flutter/Capacitor: mất PWA-instant, khác hẳn |
| OMR | Port thuật toán worker gốc (đã reverse: gray→normalize→CC→marker→projective→sample) | OpenCV.js: +8MB wasm, tính năng thừa |
| DOCX | Tự parse/ghi OOXML (giữ hình, MathType OLE — app gốc cũng làm vậy) | mammoth: mất formatting; docx lib: không giữ OLE MathType |
| Excel | SheetJS `xlsx` (đọc+ghi, giống chunk xlsx của gốc) | Tự viết: tốn công không cần |
| QR đọc | `BarcodeDetector` + fallback `jsQR` | chỉ jsQR: chậm hơn native |
| Thư viện phiếu | Mirror toàn bộ `/thu-vien/` (user chọn) | Sinh riêng: thiếu 819 mẫu |
| Sync | Supabase + Drive (kiến trúc gốc, keys của user) | Backend riêng: phạm vi quá lớn |
| Branding | Logo/tên/màu mới Chamthi365, giữ design language | Đổi hẳn UI: mất "giống hệt" |

## 7. Tính năng QR mới (cả hai hướng user chọn)

### 7.1 QR trên phiếu (thay ô mã đề)
- **Mẫu phiếu QR mới** do Chamthi365 tự sinh bằng bộ render riêng (SVG→PDF):
  giữ layout kiểu QM 2025 — 4 ô vuông mốc góc, lưới tô SBD (học sinh vẫn tô
  SBD để ghép danh sách), Phần I/II/III — nhưng **ô QR in sẵn thay lưới tô mã
  đề**. Đăng ký vào mucluc nhóm `tu:"ct365"`.
- **Sinh phiếu in**: chọn mẫu + nạp danh sách mã đề (hoặc lấy từ đáp án của
  bài) → sinh PDF: mỗi trang 1 phiếu. Hai chế độ:
  - Theo mã đề: QR = `CT365:{"v":1,"ma":"0101"}`, in N bản mỗi mã.
  - Cá nhân hoá theo DS lớp: QR = `{"v":1,"ma":"0101","sbd":"123456"}` —
    gán mã đề cho từng em (vòng xoay theo list mã hoặc file mapping SBD↔mã);
    QR có sbd thì bỏ qua lưới SBD khi đọc (ô tô vẫn in phòng QR hỏng).
- QR EC level M, quiet zone ≥4 module; kích thước in ≥20mm.
- **Khi chấm**: worker chạy `BarcodeDetector` (fallback `jsQR`) trên vùng QR
  định trong khuôn *trước* khi đọc ô; đọc được → lấy `ma`/`sbd` từ QR
  (`doc.maNguon:"qr"`); không đọc được → fallback ô tô mã đề nếu khuôn còn
  lưới mã, ngược lại cờ "chọn mã đề" ở màn xem (UI sẵn có).
- **Bộ sinh khuôn+PDF** (`src/lib/phieu-qr/`): tham số hoá (p1,p2,p3,số cột
  SBD, có/không phách) — sinh đồng thời khuon JSON (đúng schema gốc:
  trang/r/goc/moc/sbd/ma(rỗng)/p1/p2/p3/qr{x,y,canh}) và PDF vector. V1 ship
  các bộ phổ biến: 12-04-06, 40-08-06, 40-00-00, 50-00-00, 30-00-00,
  20-00-00 (+ tờ tự luận); số-câu khác sinh runtime không cần file sẵn.

### 7.2 QR nạp/chia sẻ đáp án
- Nút **"Mã QR đáp án"** ở màn đáp án + kết quả trộn đề: encode payload compact
  `CT365A:{"v":1,"soCau":{p1,p2,p3},"de":[{"ma":"0101","p1":"ABCD…","p2":"ĐSĐS…","p3":"0,5;1"}]}`;
  payload lớn → chia nhiều QR (`"i":k,"n":N`) hiển thị slideshow.
- Nút **"Quét QR nạp đáp án"** ở màn đáp án, trang chủ và sau trộn đề: camera
  đọc QR (đủ n phần ghép lại) → import như nạp Excel; hiển thị mã/số câu để
  xác nhận.
- Trang QR trong ZIP trộn đề + trên đề in (góc trang tiêu đề) để thầy quét
  nạp thẳng vào app.

## 8. Mirror thư viện phiếu & bài mẫu

Script `scripts/fetch-thu-vien.mjs` tải `muc-luc.json` + toàn bộ `khuon/*.json`,
`anh/*.webp`, `phieu/*.pdf` về `public/thu-vien/` (có retry, skip file đã có,
ghi `THU-VIEN.md` ghi nguồn + rủi ro: dữ liệu do tác giả gốc tạo, user đã xác
nhận mirror — nếu sau này phát hành công khai cần xin phép hoặc chuyển sang
tự sinh). Khuôn QR mới merge vào mucluc lúc runtime (`tu:"ct365"`), không ghi
đè file gốc.

Bài mẫu demo mirror từ `/mau/`: `bai-mau.json` (đã kiểm: bài Toán 10, phiếu
Bộ GD 40-08-06, 4 mã đề), `phieu-1..4.webp` (phiếu đã tô để trình chiếu),
`phieu-mau.pdf` → `public/mau/`.

**Branding trong artifact**: mọi file app sinh (Excel bảng điểm/đáp án, DOCX
đề+đáp án, PDF phiếu QR, footer) ghi "Chamthi365", không ghi tên/domain app
gốc. PDF thư viện mirror giữ nguyên vẹn (là phiếu in vật lý, không chỉnh sửa).

## 9. Đồng bộ — cấu hình cần từ user

- Supabase project + bảng `cp_bai`,`cp_phieu` (SQL kèm trong `supabase/schema.sql`),
  enable Google provider, redirect URL.
- Google Cloud OAuth client (Web) cho Drive scope `drive.file` — Supabase
  trả `provider_token` như cơ chế gốc.
- `.env.example` mẫu; thiếu env → nút đăng nhập hiện "chưa cấu hình".

## 10. Việc để builder quyết

- Chi tiết ngưỡng/tham số OMR (port từ worker đã tải trong `_research/`).
- Layout chi tiết từng màn (bám DOM/class app gốc trong `bundle.css`).
- Tên biến/màu logo Chamthi365.
- Chia nhỏ/đặt tên file theo convention dự án mới.

## 11. Xác minh

- `npm run build` + `vite preview` chạy PWA.
- Test OMR: sinh phiếu ảo bằng canvas theo khuôn JSON, tô ô, chạy worker.
- Test trộn đề: file docx mẫu tự tạo (nếu tải được `de-mau.docx` của gốc thì
  dùng luôn để so).
- E2E smoke: tạo bài → nạp đáp án Excel → chấm ảnh test → xuất Excel → QR
  round-trip (sinh QR → quét lại nạp).
