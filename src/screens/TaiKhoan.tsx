import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Dau, ManHinh } from '../components/ManHinh'
import { The } from '../components/The'
import { Nut } from '../components/Nut'
import { coSupabase, sb, laySession, dangNhapGoogle, dangXuat, providerToken } from '../lib/supabase'
import { dongBo, soViecCho } from '../lib/sync'
import { layThuMuc } from '../lib/drive'

export function TaiKhoan() {
  const [ses, setSes] = useState<Session | null>(null)
  const [cho, setCho] = useState(0)
  const [msg, setMsg] = useState('')
  const [url, setUrl] = useState('')
  const [dangChay, setDangChay] = useState(false)

  useEffect(() => {
    if (!coSupabase) return
    laySession().then(setSes).catch(() => { })
    const { data } = sb().auth.onAuthStateChange((_e, s) => setSes(s))
    soViecCho().then(setCho).catch(() => { })
    return () => data.subscription.unsubscribe()
  }, [])

  const chay = async () => {
    setDangChay(true); setMsg('')
    try {
      const k = await dongBo()
      setMsg(`Xong — đẩy ${k.day} mục, kéo về ${k.keo} mục.`)
      setCho(await soViecCho())
    } catch (e) { setMsg(String((e as Error)?.message ?? e)) }
    setDangChay(false)
  }

  const moDrive = async () => {
    const t = providerToken(ses)
    if (!t) { setMsg('Cần đăng nhập lại Google để có quyền Drive (token 50\').'); return }
    try {
      const tm = await layThuMuc(t)
      setUrl(tm.url)
      open(tm.url, '_blank')
    } catch (e) { setMsg(String((e as Error)?.message ?? e)) }
  }

  return (
    <ManHinh dau={<Dau tieuDe="Tài khoản & đồng bộ" />}>
      {!coSupabase ? (
        <The>
          <h2>Chưa cấu hình đồng bộ</h2>
          <p className="mo">Chamthi365 chạy đầy đủ ngoại tuyến — bài chấm lưu ngay trên máy này.</p>
          <p className="mo">Muốn đồng bộ nhiều máy: tạo project ở supabase.com, chạy <code>supabase/schema.sql</code>, điền <code>VITE_SUPABASE_URL</code> và <code>VITE_SUPABASE_ANON_KEY</code> vào <code>.env</code> rồi build lại.</p>
        </The>
      ) : (
        <The>
          {ses ? (
            <>
              <h2>Đã đăng nhập</h2>
              <p className="mo">{ses.user.email}</p>
              {cho > 0 && <p className="mo">Còn {cho} mục chờ đồng bộ.</p>}
              {msg && <p style={{ fontWeight: 700 }}>{msg}</p>}
              <div className="hang" style={{ flexWrap: 'wrap' }}>
                <Nut kieu="xanh" onClick={chay} disabled={dangChay}>{dangChay ? 'Đang đồng bộ…' : 'Đồng bộ ngay'}</Nut>
                <Nut kieu="nhat" onClick={moDrive}>Thư mục Drive</Nut>
                <Nut kieu="do" onClick={() => dangXuat()}>Đăng xuất</Nut>
              </div>
              {url && <p className="mo"><a href={url} target="_blank" rel="noreferrer">{url}</a></p>}
              <p className="mo nho">Bài chấm + phiếu đồng bộ qua Supabase; ảnh phiếu up vào thư mục Drive “Chamthi365” (quyền drive.file). Quyền Drive hết hạn sau ~50 phút — đăng nhập lại nếu up ảnh bị dừng.</p>
            </>
          ) : (
            <>
              <h2>Đồng bộ nhiều máy</h2>
              <p className="mo">Đăng nhập Google để đồng bộ bài chấm, phiếu và ảnh giữa các thiết bị. Không đăng nhập app vẫn chấm bình thường.</p>
              <Nut kieu="xanh" onClick={() => dangNhapGoogle()}>Đăng nhập bằng Google</Nut>
            </>
          )}
        </The>
      )}
    </ManHinh>
  )
}
