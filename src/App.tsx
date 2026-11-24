import { Suspense, lazy, useEffect, useState } from 'react'
import { ManHinh } from './components/ManHinh'
import { NutDen } from './components/Nut'
import { Home } from './screens/Home'
import { HuongDan } from './screens/HuongDan'
import { TaoBai } from './screens/TaoBai'
import { DapAnScr } from './screens/DapAn'
import { Camera } from './screens/Camera'
import { ChamTep } from './screens/ChamTep'
import { PhieuXem } from './screens/PhieuXem'
import { BaiXem } from './screens/BaiXem'
import { KetQua, KetQuaTab } from './screens/KetQua'
import { HocSinhScr } from './screens/HocSinh'
// Trộn đề (docx parser) nặng — tách chunk riêng
const Tron = lazy(() => import('./screens/Tron').then(m => ({ default: m.Tron })))
import { InPhieu } from './screens/InPhieu'
import { TaiKhoan } from './screens/TaiKhoan'
import { BaiMau } from './screens/BaiMau'
import { DanhSach } from './screens/DanhSach'
import { khoiDongSync } from './lib/sync'
import { coSupabase } from './lib/supabase'
import { Construction } from 'lucide-react'

const docHash = () => (typeof location === 'undefined' ? '#/' : location.hash || '#/')

export function useHash(): string {
  const [h, setH] = useState(docHash)
  useEffect(() => {
    const f = () => setH(docHash())
    addEventListener('hashchange', f)
    return () => removeEventListener('hashchange', f)
  }, [])
  return h
}

/** Phân tích route: { ten, id } — ví dụ #/bai/abc → { ten:'bai', id:'abc' } */
export function tachRoute(h: string): { ten: string; id: string | null } {
  const p = (h.replace(/^#\/?/, '') || '').split('?')[0].split('/').filter(Boolean)
  return { ten: p[0] ?? '', id: p[1] ?? null }
}

function SapCo({ ten }: { ten: string }) {
  return (
    <ManHinh dau={
      <header className="mh-dau">
        <img src="/logo365.svg" alt="" width="34" height="34" />
        <h1>{ten}</h1>
      </header>
    }>
      <div className="giua khoi">
        <Construction size={44} strokeWidth={1.6} style={{ color: 'var(--ink-faint)' }} />
        <p className="mo">Màn hình này đang được xây dựng.</p>
        <NutDen to="#/" kieu="nhat">Về trang chủ</NutDen>
      </div>
    </ManHinh>
  )
}

export function App() {
  const h = useHash()
  const { ten, id } = tachRoute(h)

  if (ten === '' || ten === 'home') return <Home />
  if (ten === 'huong-dan') return <HuongDan />
  if (ten === 'tao') return <TaoBai />
  if (ten === 'sua') return <TaoBai id={id ?? undefined} />
  if (ten === 'bai' && id) {
    const p2 = h.split('?')[0].split('/').filter(Boolean)[2]
    if (p2 === 'dap-an') return <DapAnScr id={id} />
    if (p2 === 'ket-qua') return <KetQua id={id} />
    if (p2 === 'hoc-sinh') return <HocSinhScr id={id} />
    return <BaiXem id={id} />
  }
  if (ten === 'cham') return h.includes('tep=1') ? <ChamTep id={id ?? ''} /> : <Camera id={id ?? ''} />
  if (ten === 'phieu') return <PhieuXem id={id ?? ''} />
  if (ten === 'ket-qua') return <KetQuaTab />
  if (ten === 'tron-de') return <Suspense fallback={<ManHinh><p className="mo giua khoi">Đang tải trộn đề…</p></ManHinh>}><Tron /></Suspense>
  if (ten === 'in-phieu') return <InPhieu />
  if (ten === 'tai-khoan') return <TaiKhoan />
  if (ten === 'bai-mau') return <BaiMau />
  if (ten === 'danh-sach') return <DanhSach />
  return <SapCo ten="Không thấy trang" />
}

// Tự đồng bộ khi dữ liệu đổi (chỉ khi đã cấu hình Supabase + có mạng)
if (typeof window !== 'undefined' && coSupabase) khoiDongSync()
