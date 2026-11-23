import { useEffect, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The, Muc } from '../components/The'
import { dsPhieu, layBai, xoaBai, xoaPhieu } from '../lib/db'
import { chamPhieu, dinhDangDiem } from '../lib/diem'
import { docHieuLuc, diemTuLuan } from '../lib/chamKq'
import type { Bai, Phieu } from '../types'

export function BaiXem({ id }: { id: string }) {
  const [bai, setBai] = useState<Bai | null>(null)
  const [ds, setDs] = useState<Phieu[]>([])
  const [khong, setKhong] = useState(false)

  useEffect(() => {
    layBai(id).then(async b => {
      if (!b) { setKhong(true); return }
      setBai(b)
      setDs((await dsPhieu(id)).sort((a, x) => x.stt - a.stt || x.luc - a.luc))
    })
  }, [id])

  if (khong) return <ManHinh><The className="giua khoi"><p className="mo">Bài chấm này không còn trong máy.<br />Có thể đã bị xoá ở máy này, hoặc xoá ở máy khác rồi đồng bộ về.</p><NutDen to="#/" kieu="nhat">Về danh sách bài chấm</NutDen></The></ManHinh>
  if (!bai) return <ManHinh><p className="mo giua khoi">Đang mở…</p></ManHinh>

  const ok = ds.filter(p => p.ok)
  const canXem = ok.filter(p => p.kq!.can.length > 0).length
  const loi = ds.length - ok.length

  const xoa = async () => {
    if (!confirm(`Xóa bài "${bai.ten}" và ${ds.length} phiếu đã chấm?`)) return
    for (const p of ds) await xoaPhieu(p.id)
    await xoaBai(bai.id)
    location.hash = '#/'
  }

  return (
    <ManHinh dau={<Dau tieuDe={bai.ten} phu={`${bai.mon} · ${bai.lop.join(', ')}`} />}>
      <div className="hang khoi" style={{ flexWrap: 'wrap' }}>
        <NutDen to={`#/cham/${bai.id}`} kieu="xanh" style={{ flex: 1, minWidth: 130 }}>📷 Chấm camera</NutDen>
        <NutDen to={`#/cham/${bai.id}?tep=1`} kieu="vang" style={{ flex: 1, minWidth: 130 }}>Chấm từ tệp</NutDen>
        <NutDen to={`#/bai/${bai.id}/ket-qua`} kieu="tim" style={{ flex: 1, minWidth: 130 }}>📊 Kết quả</NutDen>
      </div>
      <div className="hang khoi" style={{ flexWrap: 'wrap' }}>
        <NutDen to={`#/bai/${bai.id}/dap-an`} kieu="nhat" nho>Đáp án ({bai.dapAn.length} mã)</NutDen>
        <NutDen to={`#/bai/${bai.id}/hoc-sinh`} kieu="nhat" nho>Học sinh ({bai.hocSinh.length})</NutDen>
        <NutDen to={`#/sua/${bai.id}`} kieu="nhat" nho>Sửa bài</NutDen>
        <Nut kieu="do" nho onClick={xoa}>Xóa bài</Nut>
      </div>

      {(canXem > 0 || loi > 0) && (
        <The pang className="khoi">
          {canXem > 0 && <p style={{ color: 'var(--orange-d)', margin: 0 }}>⚠ {canXem} phiếu còn chỗ cần xem — máy chưa chắc, SBD trùng hoặc tô vào câu thừa.</p>}
          {loi > 0 && <p style={{ color: 'var(--red-d)', margin: '4px 0 0' }}>✗ {loi} phiếu không đọc được.</p>}
        </The>
      )}

      <Muc phai={<span className="mo nho">{ds.length} phiếu</span>}>Phiếu đã chấm</Muc>
      {ds.map(p => {
        const kq = p.ok && p.kq ? chamPhieu(bai, docHieuLuc(p), diemTuLuan(p)) : null
        return (
          <a key={p.id} href={`#/phieu/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <The pang className="khoi">
              <div className="hang" style={{ justifyContent: 'space-between' }}>
                <span>
                  <b>Phiếu số {p.stt}</b>
                  <div className="mo nho">
                    {p.ok ? `SBD ${p.kq!.doc.sbd || '?'} · mã ${p.kq!.doc.ma || '?'}` : `Không đọc được · ${p.loi ?? ''}`}
                    {p.kq && p.kq.can.length > 0 && <span style={{ color: 'var(--orange-d)' }}> · {p.kq.can.length} cần xem</span>}
                  </div>
                </span>
                <b style={{ color: 'var(--green-d)', fontSize: 18 }}>{kq?.coDapAn ? dinhDangDiem(kq.tong) : '—'}</b>
              </div>
            </The>
          </a>
        )
      })}
      {!ds.length && <p className="mo giua khoi">Chưa chấm phiếu nào — bấm “Chấm camera” hoặc “Chấm từ tệp”.</p>}
    </ManHinh>
  )
}
