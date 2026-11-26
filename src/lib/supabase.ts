// Supabase client lazy-init — thiếu env → tính năng tài khoản tắt
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const coSupabase = !!(URL_ && KEY)

// OAuth redirect: gotrue có thể nhét ?code= vào sau fragment (do redirectTo có '#')
// → dời lên query để supabase-js nhận PKCE; đánh dấu để App điều hướng về tai-khoan.
// Chạy ở module top — trước khi sb() được tạo.
export const veSauOAuth = typeof location !== 'undefined' && /(access_token|refresh_token|error)(_|)=|[?&]code=/.test(location.hash)
// Token implicit giữ lại ở module level — client có thể dọn hash trước khi App đọc
export const oauthTokens = (() => {
  const h = typeof location === 'undefined' ? '' : location.hash
  const at = h.match(/[#?&]access_token=([^&]+)/)?.[1]
  const rt = h.match(/[#?&]refresh_token=([^&]+)/)?.[1]
  return at ? { access_token: decodeURIComponent(at), refresh_token: decodeURIComponent(rt ?? '') } : null
})()
// URL callback thô (che giá trị) — debug khi đăng nhập hỏng
export const oauthUrlDebug = typeof location === 'undefined' ? ''
  : location.href.replace(/=([^&#]{4})[^&#]*/g, (_m, p) => `=${p}…`)
// Lỗi OAuth trả trong URL (gotrue thường nuốt im) — để App hiện cho người dùng
export const loiOAuth = (() => {
  if (typeof location === 'undefined') return null
  const g = (k: string) => (location.hash.match(new RegExp(`[?&]${k}=([^&]+)`)) || location.search.match(new RegExp(`[?&]${k}=([^&]+)`)))?.[1]
  const e = g('error') || g('error_code')
  return e ? decodeURIComponent((g('error_description') ?? e).replace(/\+/g, ' ')) : null
})()
if (veSauOAuth) {
  const m = location.hash.match(/[?&]code=([^&]+)/)
  if (m) history.replaceState(null, '', `${location.pathname}?code=${decodeURIComponent(m[1])}#/tai-khoan`)
}

let _sb: SupabaseClient | null = null
export function sb(): SupabaseClient {
  if (!_sb) {
    if (!coSupabase) throw new Error('Chưa cấu hình Supabase (VITE_SUPABASE_URL/ANON_KEY)')
    _sb = createClient(URL_!, KEY!, { auth: { persistSession: true, autoRefreshToken: true } })
  }
  return _sb
}

export const laySession = () => sb().auth.getSession().then(r => r.data.session)

/** Đăng nhập Google qua Supabase OAuth, xin luôn scope drive.file để up ảnh */
export function dangNhapGoogle() {
  return sb().auth.signInWithOAuth({
    provider: 'google',
    options: {
      // KHÔNG đặt '#' trong redirectTo — gotrue nối token vào sau tạo URL hai '#'
      // → param vỡ tên, SDK không đọc được. Về origin rồi App tự điều hướng.
      redirectTo: location.origin + '/',
      scopes: 'https://www.googleapis.com/auth/drive.file',
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
}

export const dangXuat = () => sb().auth.signOut()

/** provider_token Google (scope drive.file) — chỉ sống ~50 phút */
export const providerToken = (s: Session | null) => s?.provider_token ?? null
