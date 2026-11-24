import { useEffect, useMemo, useState } from 'react'
import { ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The } from '../components/The'
import { datMeta, layMeta } from '../lib/db'

export const KHOA_HD = 'cp-da-xem-hd'

type TheHd = { buoc?: string; tieuDe: string; noiDung: string }

/** 5 bước onboarding — copy port từ app gốc */
const CAC_BUOC: TheHd[] = [
  {
    tieuDe: 'Chào mừng quý thầy cô',
    noiDung: 'Chấm phiếu trắc nghiệm bằng camera điện thoại: đưa phiếu vào là có điểm, không cần máy quét.',
  },
  {
    buoc: 'Bước 1', tieuDe: 'Tạo bài chấm',
    noiDung: 'Đặt tên bài, chọn mẫu phiếu. Không biết phiếu loại nào thì bấm Quét phiếu, chụp một tờ là máy tìm giúp.',
  },
  {
    buoc: 'Bước 2', tieuDe: 'Nhập đáp án',
    noiDung: 'Nạp tệp Excel, dán/gõ đáp án, hoặc bấm "Quét QR nạp" để chụp mã QR đáp án (QR Chamthi365 hoặc QR có sẵn chứa chuỗi đáp án). Mỗi mã đề một dòng, máy tự khớp.',
  },
  {
    buoc: 'Bước 3', tieuDe: 'Đưa phiếu vào camera',
    noiDung: 'Giữ yên một chút: khung xanh sáng lên, máy tự chụp và hiện điểm ngay. Đưa tờ tiếp theo vào là chấm tiếp.',
  },
  {
    buoc: 'Bước 4', tieuDe: 'Xem lại chỗ máy chưa chắc',
    noiDung: 'Vòng cam là chỗ học sinh tô mờ hay tô hai ô. Bấm vào để chọn đáp án đúng, điểm tự tính lại.',
  },
  {
    buoc: 'Bước 5', tieuDe: 'Kết quả và bảng điểm',
    noiDung: 'Điểm từng em, câu nhiều em sai, xuất Excel. Lưu lên tài khoản Google để dùng trên nhiều máy.',
  },
  {
    tieuDe: 'Xem nhanh các nút nhé',
    noiDung: 'Vài bước ngắn, app chỉ cho thầy cô từng nút trên màn hình chính.',
  },
]

/** Tour "Xem các nút" — giải thích từng nút trên màn hình chính (copy app gốc) */
const CAC_NUT: { ten: string; mo: string }[] = [
  { ten: 'Tạo bài chấm', mo: 'Bắt đầu ở đây cho mỗi bài kiểm tra: tên bài, mẫu phiếu, cách tính điểm, rồi nhập đáp án.' },
  { ten: 'Chấm', mo: 'Mở camera chấm bài gần nhất. Cũng chấm được từ ảnh có sẵn hay tệp PDF máy scan.' },
  { ten: 'Kết quả', mo: 'Điểm từng em, phiếu còn chỗ cần xem, thống kê câu và nút xuất Excel.' },
  { ten: 'In phiếu', mo: 'Thư viện mẫu phiếu tải PDF in cho học sinh, kể cả phiếu QR in sẵn mã đề và SBD từng em.' },
  { ten: 'Danh sách', mo: 'Nạp danh sách lớp từ Excel để máy ghi đúng tên em theo số báo danh.' },
  { ten: 'Tài khoản', mo: 'Đăng nhập Google để bài chấm và ảnh phiếu được lưu lên mạng, đổi máy không mất.' },
  { ten: 'Xem lại hướng dẫn', mo: 'Quên cách làm thì bấm nút này, hướng dẫn hiện lại từ đầu.' },
]

export function HuongDan() {
  const [i, setI] = useState(0)
  const [xemNut, setXemNut] = useState(false)
  const buoc = CAC_BUOC[i]
  const cuoi = i === CAC_BUOC.length - 1

  const xong = async () => {
    await datMeta(KHOA_HD, 1)
    location.hash = '#/'
  }

  if (xemNut) {
    return (
      <ManHinh tab={false} dau={
        <header className="mh-dau">
          <img src="/logo365.svg" alt="" width="34" height="34" />
          <h1>Các nút trên màn hình chính</h1>
        </header>
      }>
        <div className="khoi">
          {CAC_NUT.map((n, v) => (
            <The key={v} pang className="khoi">
              <b>{n.ten}</b>
              <div className="mo nho" style={{ marginTop: 4 }}>{n.mo}</div>
            </The>
          ))}
          <The pang className="giua">
            <b>Thầy cô đã sẵn sàng!</b>
            <div className="mo nho" style={{ marginTop: 4 }}>
              Muốn xem lại, bấm nút <b>?</b> cạnh lời chào ở trang chủ.
            </div>
            <div className="cach" />
            <Nut kieu="xanh" onClick={xong}>Bắt đầu dùng</Nut>
          </The>
        </div>
      </ManHinh>
    )
  }

  return (
    <ManHinh tab={false} dau={
      <header className="mh-dau">
        <img src="/logo365.svg" alt="" width="34" height="34" />
        <h1>Hướng dẫn dùng Chamthi365</h1>
        <span className="phu">Thẻ {i + 1} trên {CAC_BUOC.length}</span>
      </header>
    }>
      <div className="khoi giua">
        <The>
          {buoc.buoc && <div className="chip bat" style={{ marginBottom: 10 }}>{buoc.buoc}</div>}
          <h2 style={{ fontSize: 22 }}>{buoc.tieuDe}</h2>
          <p className="mo" style={{ fontSize: 16 }}>{buoc.noiDung}</p>
        </The>

        <div className="hang giua" style={{ justifyContent: 'center', margin: '16px 0' }}>
          {CAC_BUOC.map((_, v) => (
            <button key={v} aria-label={`Thẻ ${v + 1}`} onClick={() => setI(v)}
              className={`chip ${v === i ? 'bat' : ''}`} style={{ width: 14, height: 14, padding: 0, borderRadius: 99 }} />
          ))}
        </div>

        <div className="hang" style={{ justifyContent: 'center' }}>
          {i > 0 && <Nut kieu="nhat" onClick={() => setI(i - 1)}>Bước trước</Nut>}
          {!cuoi && <Nut kieu="xanh" onClick={() => setI(i + 1)}>{i === 0 ? 'Bắt đầu' : 'Tiếp'}</Nut>}
          {cuoi && <Nut kieu="vang" onClick={() => setXemNut(true)}>Xem các nút</Nut>}
        </div>

        <div className="cach" />
        <NutDen to="#/" kieu="nhat" nho onClick={() => datMeta(KHOA_HD, 1)}>Bỏ qua</NutDen>
        <div className="cach" />
        <div className="mo nho">Hoặc thử ngay với bài mẫu có sẵn phiếu — ở trang chủ bấm “Thử với bài mẫu”.</div>
      </div>
    </ManHinh>
  )
}

/** Hook kiểm tra đã xem hướng dẫn chưa (null = đang tải) */
export function useDaXemHd(): boolean | null {
  const [v, setV] = useState<boolean | null>(null)
  useEffect(() => {
    let s = true
    layMeta(KHOA_HD).then(x => { if (s) setV(!!x) }).catch(() => { if (s) setV(false) })
    return () => { s = false }
  }, [])
  return v
}
