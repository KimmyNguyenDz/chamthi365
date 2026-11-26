# Hướng dẫn publish Chamthi365

App là PWA (React + Vite), dữ liệu chính lưu IndexedDB trên máy; Supabase (đồng bộ bài chấm) và Google Drive (upload file) là tùy chọn.

- **Không cần backend tự viết** — chỉ cần host tĩnh cho `dist/`
- **Bắt buộc HTTPS** — trình duyệt chỉ cho mở camera khi trang chạy HTTPS (hoặc localhost). Cloudflare Pages / Netlify / Vercel đều có sẵn HTTPS
- Nếu không dùng đồng bộ/đăng nhập Google: bỏ qua mục 2–3, chỉ cần mục 1 + 4

---

## 1. Build

```bash
npm install
npm run build
```

Kết quả ở `dist/` (đã gồm `sw.js` service worker, manifest, thư viện phiếu ~2.6MB precache).

## 2. Supabase (đồng bộ + đăng nhập Google)

### 2.1 Tạo project

1. Vào https://supabase.com → **New project** → chọn region Singapore, đặt mật khẩu DB.
2. Vào **Project Settings → API**, lấy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 2.2 Tạo bảng

Vào **SQL Editor** → dán toàn bộ `supabase/schema.sql` → Run. Script tạo 4 bảng `cp_bai`, `cp_phieu`, `cp_lop`, `cp_meta` kèm RLS theo `user_id`.

### 2.3 Bật đăng nhập Google

1. **Google Cloud Console** → tạo project → **APIs & Services → OAuth consent screen** → External → điền tên app + email.
2. **Credentials → Create OAuth client ID → Web application**:
   - Authorized JavaScript origins: `https://<project-ref>.supabase.co`
   - Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Trong OAuth client, phần **Scopes** hoặc khi tạo credentials thêm scope `https://www.googleapis.com/auth/drive.file` (cần cho upload Drive).
4. Vào **Supabase → Authentication → Providers → Google** → bật, dán Client ID + Client Secret vừa tạo.
5. **Authentication → URL Configuration**:
   - Site URL: `https://<domain-publish>` (vd `https://chamthi365.pages.dev`)
   - Redirect URLs: thêm `https://<domain-publish>/**` và `http://localhost:5199/**` (để dev vẫn đăng nhập được)

> Google OAuth client dùng chung cho cả đăng nhập Supabase và token Drive — app xin lại token Google với scope `drive.file` sau khi đăng nhập.

## 3. File `.env`

Tạo `.env` ở gốc project (không commit — file này đã nằm trong `.gitignore`; mẫu ở `.env.example`):

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Không có 2 biến này app vẫn chạy bình thường, chỉ mục Tài khoản hiện "chưa cấu hình".

## 4. Deploy lên Cloudflare Pages

1. Đẩy code lên GitHub (repo private cũng được).
2. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Connect to Git** → chọn repo.
3. Build settings:
   - Framework preset: **Vite**
   - Build command: `npm run build`
   - Build output: `dist`
   - Node version: biến môi trường `NODE_VERSION=20`
4. **Settings → Environment variables**: thêm `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (biến `VITE_*` được đóng gói lúc build nên phải đặt trong môi trường build).
5. Deploy → được domain `https://<ten>.pages.dev`. Có thể gắn domain riêng ở **Custom domains**.

**Cách khác nhanh hơn** (không cần Git): `npx wrangler pages deploy dist` sau khi `npm run build`. Netlify/Vercel tương đương: output `dist`, nhớ khai env vars.

> Mỗi lần sửa code: build → deploy lại. Người dùng đã cài PWA sẽ tự cập nhật qua service worker (`registerType: 'autoUpdate'`), chỉ cần tải lại trang.

## 5. Kiểm tra sau khi publish

Trên **điện thoại** mở domain publish:

- [ ] Trang tải được, có gợi ý **Cài đặt app** → cài PWA lên màn hình chính
- [ ] Vào **Chấm bài** → mở camera được (nếu trình duyệt hỏi quyền → Allow)
- [ ] Tạo 1 bài chấm thử → chụp 1 phiếu → điểm hiện đúng
- [ ] Mở **Tài khoản** → đăng nhập Google thành công (không bị lỗi redirect)
- [ ] Nhấn **Đồng bộ** → sang máy tính mở cùng domain, đăng nhập cùng tài khoản → thấy bài chấm
- [ ] Tắt mạng → app vẫn mở được (PWA offline)

## 6. Lỗi thường gặp

| Lỗi | Nguyên nhân | Cách sửa |
|---|---|---|
| Đăng nhập Google xong quay về trang trắng | Thiếu Redirect URL ở Supabase | Thêm `https://<domain>/**` vào URL Configuration |
| Camera không mở | Trang không HTTPS | Dùng domain `.pages.dev` / HTTPS, không dùng IP http |
| "Đồng bộ" báo lỗi bảng không tồn tại | Chưa chạy `schema.sql` | Chạy script trong SQL Editor |
| App cũ không cập nhật | Cache service worker | Ctrl+Shift+R (điện thoại: xóa app cài lại) |
| Upload Drive lỗi scope | OAuth client thiếu `drive.file` | Thêm scope ở Google Cloud + đăng nhập lại |
