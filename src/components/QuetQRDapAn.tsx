import { useRef, useState } from 'react'
import { QuetQR } from './QuetQR'
import { The } from './The'
import { Nut } from './Nut'
import { dsBai, luuBai } from '../lib/db'
import { docPayloadDapAn, ghepDapAn } from '../lib/qr'
import { docDapAnChuoi, docDapAnQM } from '../lib/excel'
import { thongBao } from '../lib/thongBao'
import type { Bai, DapAn } from '../types'

type Goi = { dapAn?: DapAn[]; raw?: string }
type GoiQR = NonNullable<ReturnType<typeof docPayloadDapAn>>['goi']

/**
 * Quét QR đáp án (CT365A nhiều phần quét liên tiếp / QR app QM / QR chuỗi đáp án)
 * → chọn bài chấm → gộp đáp án vào. Dùng ở trang chủ + sau trộn đề.
 */
export function QuetQRDapAn({ onDong }: { onDong: () => void }) {
  const [goi, setGoi] = useState<Goi | null>(null)
  const [ds, setDs] = useState<Bai[] | null>(null)
  const [loi, setLoi] = useState('')
  const phan = useRef(new Map<number, GoiQR>())

  const khiQuet = (t: string) => {
    const d = docPayloadDapAn(t)
    if (d) {
      phan.current.set(d.i, d.goi)
      if (phan.current.size >= d.n) {
        const g = ghepDapAn(phan.current)
        phan.current.clear()
        if (g?.dapAn.length) { setGoi({ dapAn: g.dapAn }); dsBai().then(setDs); return }
        setLoi('QR thiếu phần — quét lại từ đầu')
      } else setLoi(`Đã quét phần ${phan.current.size}/${d.n} — quét tiếp phần khác`)
      return
    }
    // Không phải CT365A — giữ nguyên chuỗi, parse theo số câu của bài được chọn
    setGoi({ raw: t })
    dsBai().then(setDs)
  }

  const napVao = async (b: Bai) => {
    let dapAn: DapAn[] = goi?.dapAn ?? []
    if (!dapAn.length && goi?.raw) {
      try {
        const qm = docDapAnQM(goi.raw, b.diem.soCau)
        if (qm) dapAn = qm
        else { const d = docDapAnChuoi(goi.raw, b.diem.soCau); if (d.ma) dapAn = [d] }
      } catch { }
    }
    if (!dapAn.length) { setLoi('QR này không chứa đáp án đọc được'); return }
    const map = new Map(b.dapAn.map(x => [x.ma, x]))
    for (const x of dapAn) map.set(x.ma, x)
    await luuBai({ ...b, dapAn: [...map.values()], sua: Date.now() })
    thongBao(`Đã nạp ${dapAn.length} mã đề vào “${b.ten}”`)
    location.hash = `#/bai/${b.id}/dap-an`
  }

  return (
    <div className="nen-phu" onClick={onDong}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: '100%' }}>
        <The className="khoi">
          {!goi ? (
            <>
              <h2>Quét QR đáp án</h2>
              <p className="mo nho">QR Chamthi365 (nhiều phần quét liên tiếp), QR app QM, hoặc QR ghi chuỗi đáp án (vd “0101 ABCD ĐSĐS 0,5;1”).</p>
              {/* key theo số phần đã quét → mỗi phần một camera mới */}
              <QuetQR key={phan.current.size} onKq={khiQuet} onDong={onDong} />
              {loi && <p className="trang-thai cam">{loi}</p>}
            </>
          ) : (
            <>
              <h2>Nạp vào bài nào?</h2>
              {goi.dapAn && (
                <p className="mo nho">{goi.dapAn.length} mã đề: {goi.dapAn.slice(0, 8).map(d => d.ma).join(', ')}{goi.dapAn.length > 8 ? '…' : ''} — kiểm tra đúng bộ mã rồi chọn bài.</p>
              )}
              {ds === null ? <p className="mo">Đang tải danh sách bài…</p>
                : ds.length === 0 ? <p className="mo">Chưa có bài chấm nào — tạo bài trước rồi quét lại.</p>
                  : <div style={{ maxHeight: '50dvh', overflowY: 'auto' }}>
                    {ds.map(b => (
                      <button key={b.id} className="chip" style={{ display: 'block', width: '100%', textAlign: 'left', margin: '6px 0', padding: '10px 12px' }}
                        onClick={() => napVao(b)}>
                        {b.ten} <span className="mo nho">· {b.dapAn.length} mã sẵn có</span>
                      </button>
                    ))}
                  </div>}
              {loi && <p className="trang-thai do">{loi}</p>}
              <div className="hang" style={{ marginTop: 8 }}>
                <Nut kieu="nhat" nho onClick={() => { setGoi(null); setLoi('') }}>← Quét lại</Nut>
                <Nut kieu="nhat" nho onClick={onDong}>Đóng</Nut>
              </div>
            </>
          )}
        </The>
      </div>
    </div>
  )
}
