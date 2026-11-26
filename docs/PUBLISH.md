# Hướng dẫn publish Chamthi365 — từ đầu đến cuối

App là PWA (React + Vite). Dữ liệu chính lưu IndexedDB trên máy; Supabase (đồng bộ bài chấm + đăng nhập Google) và Google Drive (upload ảnh phiếu) là tùy chọn nhưng nên có.

- **Không cần backend tự viết** — chỉ cần host tĩnh cho `dist/`
- **Bắt buộc HTTPS** — trình duyệt chỉ cho mở camera trên trang HTTPS (Cloudflare Pages / Netlify / Vercel đều có sẵn)
- Không dùng đồng bộ? Chỉ cần Phần 4 + 5 (build + deploy), bỏ qua Supabase/Google

## PHẦN 0 — Tài khoản cần (tất cả miễn phí)

| Tài khoản | Để làm gì |
|---|---|
| GitHub | Chứa code, nối với host |
| Supabase | Đăng nhập Google + đồng bộ bài chấm |
| Google Cloud | Cho phép đăng nhập Google + upload Drive |
| Cloudflare | Host web + HTTPS |

## PHẦN 1 — Đẩy code lên GitHub

**Cách dễ nhất — GitHub Desktop** (không cần gõ lệnh):

1. Tải https://desktop.github.com → cài → đăng nhập tài khoản GitHub
2. **File → Add local repository** → chọn thư mục project
3. **Publish repository** → tên `chamthi365` → tick **Keep this code private** → Publish

**Hoặc dòng lệnh:**

```bash
# github.com → New repository → chamthi365 → Private → Create
git remote add origin https://github.com/<ten-github>/chamthi365.git
git push -u origin main
```

## PHẦN 2 — Supabase

### 2.1 Tạo project

1. https://supabase.com → **Start your project** → **Sign in with GitHub**
2. **New organization** → **New project**:
   - Name: `chamthi365`
   - Database Password: **Generate** → copy lưu lại
   - Region: **Singapore** · Plan: **Free**
3. Chờ 1–2 phút project khởi tạo.

### 2.2 Lấy 2 khóa

**Project Settings** (bánh răng) → **API**:

- `Project URL` → `VITE_SUPABASE_URL`
- `anon` `public` key (chuỗi `eyJ...`) → `VITE_SUPABASE_ANON_KEY`

### 2.3 Tạo bảng

1. **SQL Editor** → **+ New query**
2. Dán toàn bộ `supabase/schema.sql` → **Run** → "Success"
3. **Table Editor** → thấy đủ `cp_bai`, `cp_phieu`, `cp_lop`, `cp_meta`

### 2.4 Bật Google provider — làm ở Phần 3.5

## PHẦN 3 — Google Cloud OAuth

### 3.1 Tạo project

https://console.cloud.google.com → đăng nhập Gmail → ô chọn project trên cùng → **New Project** → tên `chamthi365` → **Create**.

### 3.2 Consent screen

1. **APIs & Services → OAuth consent screen** → **Get started**
2. App name `Chamthi365` · support email = email mình → **Next**
3. Audience: **External** → **Next** → contact email → đồng ý → **Create**

### 3.3 Test users + scope Drive (bắt buộc)

1. **Audience** → **Test users → + Add users** → thêm email mình + email thầy cô sẽ dùng (tối đa 100). Chế độ Testing không cần Google duyệt, chỉ test users login được.
2. **Data access → Add or remove scopes** → lọc `drive.file` → tick `.../auth/drive.file` → **Update → Save**

### 3.4 OAuth Client ID

1. **Credentials → + Create Credentials → OAuth client ID**
2. Type: **Web application**, name `chamthi365`
3. **Authorized JavaScript origins**: `https://<project-ref>.supabase.co`
4. **Authorized redirect URIs**: `https://<project-ref>.supabase.co/auth/v1/callback` (gõ đúng từng chữ)
5. **Create** → copy **Client ID** + **Client Secret**

### 3.5 Nối vào Supabase

Supabase → **Authentication → Sign In / Providers → Google** → bật → dán Client ID + Secret → **Save**.

> App tự xin scope `drive.file` khi đăng nhập (`signInWithOAuth` trong `src/lib/supabase.ts`) — chỉ cần consent screen có scope đó là đủ.

## PHẦN 4 — `.env` + build

Copy `.env.example` → `.env` rồi điền:

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_DRIVE_FOLDER=        # để trống = tự tạo thư mục "Chamthi365"
```

`VITE_DRIVE_FOLDER` để trống. Anon key public **không sao** — bảng có RLS, mỗi user chỉ thấy dữ liệu mình.

```bash
npm install
npm run build   # → dist/
```

## PHẦN 5 — Deploy Cloudflare Pages

1. https://dash.cloudflare.com → đăng ký → xác nhận email
2. **Workers & Pages → Create → Pages → Connect to Git** → **GitHub** → authorize → chọn repo `chamthi365` → **Begin setup**
3. Project name `chamthi365` · Production branch `main` · Framework preset **Vite**
4. **Environment variables** (bắt buộc, biến `VITE_*` đóng gói lúc build):
   - `NODE_VERSION` = `20`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` = giá trị ở 2.2
5. **Save and Deploy** → ~2–3 phút → `https://chamthi365.pages.dev`

**Cách nhanh hơn không cần GitHub**: điền `.env` → `npm run build` → `npx wrangler pages deploy dist` → đăng nhập Cloudflare → xong.

Netlify/Vercel tương đương: output `dist`, khai env vars trước khi build.

## PHẦN 6 — Báo domain cho Supabase

**Authentication → URL Configuration**:

- Site URL: `https://chamthi365.pages.dev`
- Redirect URLs → Add: `https://chamthi365.pages.dev/**` (giữ `http://localhost:*/**` cho dev)

Không cần build lại — chỉ cấu hình phía Supabase.

## PHẦN 7 — Kiểm tra trên điện thoại

- [ ] Mở domain → cài PWA (Chrome ⋮ → "Add to Home screen")
- [ ] **Chấm bài** → camera mở được (Allow quyền)
- [ ] Tạo bài + chấm 1 phiếu → điểm hiện
- [ ] **Tài khoản → Đăng nhập Google** → thành công
  - Google báo "chưa được xác minh" → **Advanced → Go to Chamthi365** (bình thường ở Testing)
- [ ] **Đồng bộ** → mở link trên máy tính, login cùng tài khoản → thấy bài
- [ ] Tắt mạng → app vẫn mở (PWA offline)

## PHẦN 8 — (Tùy chọn) Domain riêng + cập nhật sau này

**Domain riêng**: mua tên miền → Pages project → **Custom domains → Set up** → nhập domain → tạo bản ghi CNAME theo hướng dẫn → HTTPS tự có. Sau đó đổi Site URL + thêm Redirect URL mới ở Supabase (Phần 6).

**Cập nhật app**: sửa code → `git push` → Pages tự build + deploy ~2 phút → người dùng tải lại trang là có bản mới (service worker `autoUpdate`).

## Lỗi thường gặp

| Lỗi | Sửa |
|---|---|
| Login xong trang trắng / redirect_mismatch | Thiếu Redirect URL (Phần 6) — thêm `https://<domain>/**` |
| "Access blocked: not been verified" | Email chưa nằm trong Test users (3.3) |
| Camera không mở | Đang dùng `http://` — phải `https://` |
| Sync báo lỗi bảng | Chưa chạy `schema.sql` (2.3) |
| Drive không upload | Thiếu scope `drive.file` (3.3) → thêm + đăng nhập lại |
| Build fail trên Pages | Thiếu `NODE_VERSION=20` |
| App cũ không cập nhật | Ctrl+Shift+R / xóa PWA cài lại |
