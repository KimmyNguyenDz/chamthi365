import type { PropsWithChildren, ReactNode } from 'react'
import { useHash } from '../App'
import { BarChart3, ClipboardList, Printer, Shuffle, UserCircle, Users } from 'lucide-react'

const IcBai = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="3" width="16" height="18" rx="2.5" /><circle cx="9" cy="9" r="1.6" fill="currentColor" stroke="none" /><circle cx="9" cy="14" r="1.6" /><circle cx="15" cy="9" r="1.6" /><circle cx="15" cy="14" r="1.6" />
  </svg>
)
const IcKetQua = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M2 20h20" />
  </svg>
)
const IcTron = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="M4 4l5 5" />
  </svg>
)

function TabDen({ to, ten, ic, bat }: { to: string; ten: string; ic: ReactNode; bat: boolean }) {
  return <a href={to} className={bat ? 'bat' : ''}>{ic}<span>{ten}</span></a>
}

const MENU = [
  { to: '#/', ten: 'Bài chấm', ic: <ClipboardList size={19} />, bat: (h: string) => h === '#/' || h.startsWith('#/bai') || h.startsWith('#/tao') || h.startsWith('#/sua') || h.startsWith('#/cham') || h.startsWith('#/phieu') },
  { to: '#/ket-qua', ten: 'Kết quả', ic: <BarChart3 size={19} />, bat: (h: string) => h.startsWith('#/ket-qua') },
  { to: '#/danh-sach', ten: 'Học sinh', ic: <Users size={19} />, bat: (h: string) => h.startsWith('#/danh-sach') },
  { to: '#/in-phieu', ten: 'In phiếu', ic: <Printer size={19} />, bat: (h: string) => h.startsWith('#/in-phieu') || h.startsWith('#/bai-mau') },
  { to: '#/tron-de', ten: 'Trộn đề', ic: <Shuffle size={19} />, bat: (h: string) => h.startsWith('#/tron-de') },
]

/**
 * Khung màn hình chuẩn: sidebar trái (desktop) / tab bar dưới (mobile)
 * + header + nội dung cuộn.
 */
export function ManHinh({ children, dau, tab = true, rong = false }: PropsWithChildren<{ dau?: ReactNode; tab?: boolean; rong?: boolean }>) {
  const h = useHash()
  return (
    <div className="mh">
      <aside className="sb">
        <a href="#/" className="sb-logo"><img src="/logo.png" alt="" width={30} /><span>Chamthi365</span></a>
        <nav>
          {MENU.map(m => <a key={m.to} href={m.to} className={m.bat(h) ? 'bat' : ''}>{m.ic}<span>{m.ten}</span></a>)}
        </nav>
        <div className="sb-chan">
          <a href="#/tai-khoan" className={h.startsWith('#/tai-khoan') ? 'bat' : ''}><UserCircle size={19} /><span>Tài khoản</span></a>
        </div>
      </aside>
      <div className="mh-phai">
        {dau}
        <div className={`mh-noi${rong ? ' rong' : ''}`}>{children}</div>
      </div>
      {tab && (
        <nav className="tab" aria-label="Điều hướng">
          <TabDen to="#/" ten="Bài chấm" ic={IcBai} bat={h === '#/' || h.startsWith('#/bai') || h.startsWith('#/tao')} />
          <TabDen to="#/ket-qua" ten="Kết quả" ic={IcKetQua} bat={h.startsWith('#/ket-qua')} />
          <TabDen to="#/tron-de" ten="Trộn đề" ic={IcTron} bat={h.startsWith('#/tron-de')} />
        </nav>
      )}
    </div>
  )
}

/** Đầu màn hình: nền xanh trời, tiêu đề + phụ + cụm nút phải */
export function Dau({ tieuDe, phu, phai }: { tieuDe: ReactNode; phu?: ReactNode; phai?: ReactNode }) {
  return (
    <header className="mh-dau">
      <a href="#/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
        <img src="/logo.png" alt="" width="34" />
        <h1>{tieuDe}</h1>
      </a>
      {phu ? <span className="phu">{phu}</span> : null}
      {phai}
    </header>
  )
}
