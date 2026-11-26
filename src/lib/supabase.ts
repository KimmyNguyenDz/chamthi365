// Supabase client lazy-init — thiếu env → tính năng tài khoản tắt
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js'

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const coSupabase = !!(URL_ && KEY)

// OAuth redirect: gotrue có thể nhét ?code= vào sau fragment (do redirectTo có '#')
// → dời lên query để supabase-js nhận PKCE; đánh dấu để App điều hướng về tai-khoan.
// Chạy ở module top — trước khi sb() được tạo.
export const veSauOAuth = typeof location !== 'undefined' && /(access_token|refresh_token|error)=|[?&]code=/.test(location.hash)
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
      redirectTo: location.origin + '/#/tai-khoan',
      scopes: 'https://www.googleapis.com/auth/drive.file',
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  })
}

export const dangXuat = () => sb().auth.signOut()

/** provider_token Google (scope drive.file) — chỉ sống ~50 phút */
export const providerToken = (s: Session | null) => s?.provider_token ?? null
