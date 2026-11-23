import { useEffect, useState } from 'react'
import { ManHinh } from './components/ManHinh'
import { NutDen } from './components/Nut'
import { Home } from './screens/Home'
import { HuongDan } from './screens/HuongDan'
import { TaoBai } from './screens/TaoBai'
import { DapAnScr } from './screens/DapAn'
import { Camera } from './screens/Camera'

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
        <div style={{ fontSize: 44 }}>🚧</div>
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
    return <SapCo ten="Bài chấm" />
  }
  if (ten === 'cham') return <Camera id={id ?? ''} />
  if (ten === 'ket-qua') return <SapCo ten="Kết quả" />
  if (ten === 'tron-de') return <SapCo ten="Trộn đề Word" />
  if (ten === 'in-phieu') return <SapCo ten="Thư viện mẫu phiếu" />
  if (ten === 'danh-sach') return <SapCo ten="Danh sách học sinh" />
  if (ten === 'tai-khoan') return <SapCo ten="Tài khoản" />
  return <SapCo ten="Không thấy trang" />
}
