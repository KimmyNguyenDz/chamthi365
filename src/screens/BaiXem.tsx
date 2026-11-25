import { useEffect, useState } from 'react'
import { Camera, FileText, BarChart3, AlertTriangle, XCircle, Trash2 } from 'lucide-react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The, Muc } from '../components/The'
import { dsPhieu, layBai, xoaBai, xoaPhieu } from '../lib/db'
import { chamPhieu, dinhDangDiem } from '../lib/diem'
import { docHieuLuc, diemTuLuan } from '../lib/chamKq'
import { canhBaoPhieu } from '../lib/phieu'
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
  // đối chiếu SBD/mã đề với danh sách lớp + đáp án
  const sbdDem = new Map<string, number>()
  for (const p of ok) { const s = docHieuLuc(p).sbd.replace(/^0+/, ''); s && sbdDem.set(s, (sbdDem.get(s) ?? 0) + 1) }
  const canhBao = (p: Phieu) => {
    const doc = docHieuLuc(p)
    return canhBaoPhieu(bai, doc, (sbdDem.get(doc.sbd.replace(/^0+/, '') || '∅') ?? 0) > 1)
  }
  const soCanhBao = ok.filter(p => canhBao(p).length > 0).length

  const xoa = async () => {
    if (!confirm(`Xóa bài "${bai.ten}" và ${ds.length} phiếu đã chấm?`)) return
    for (const p of ds) await xoaPhieu(p.id)
    await xoaBai(bai.id)
    location.hash = '#/'
  }

  return (
    <ManHinh dau={<Dau tieuDe={bai.ten} phu={`${bai.mon} · ${bai.lop.join(', ')}`} />}>
      <div className="hang khoi" style={{ flexWrap: 'wrap' }}>
        <NutDen to={`#/cham/${bai.id}`} kieu="xanh" style={{ flex: 1 }}><Camera /> Chấm camera</NutDen>
        <NutDen to={`#/cham/${bai.id}?tep=1`} kieu="vang" style={{ flex: 1 }}><FileText /> Chấm từ tệp</NutDen>
        <NutDen to={`#/bai/${bai.id}/ket-qua`} kieu="tim" style={{ flex: 1 }}><BarChart3 /> Kết quả</NutDen>
      </div>
      <div className="hang khoi" style={{ flexWrap: 'wrap' }}>
        <NutDen to={`#/bai/${bai.id}/dap-an`} kieu="nhat" nho>Đáp án ({bai.dapAn.length} mã)</NutDen>
        <NutDen to={`#/bai/${bai.id}/hoc-sinh`} kieu="nhat" nho>Học sinh ({bai.hocSinh.length})</NutDen>
        <NutDen to={`#/sua/${bai.id}`} kieu="nhat" nho>Sửa bài</NutDen>
        <Nut kieu="do" nho onClick={xoa}>Xóa bài</Nut>
      </div>

      {(canXem > 0 || loi > 0 || soCanhBao > 0) && (
        <The pang className="khoi">
          {soCanhBao > 0 && <p className="trang-thai do" style={{ margin: 0 }}><AlertTriangle size={15} /> {soCanhBao} phiếu lệch danh sách/đáp án — sai mã đề hoặc SBD không khớp, bấm vào từng phiếu để xử lý.</p>}
          {canXem > 0 && <p className="trang-thai cam" style={{ margin: '4px 0 0' }}><AlertTriangle size={15} /> {canXem} phiếu còn chỗ cần xem — máy chưa chắc, SBD trùng hoặc tô vào câu thừa.</p>}
          {loi > 0 && <p className="trang-thai do" style={{ margin: '4px 0 0' }}><XCircle size={15} /> {loi} phiếu không đọc được.</p>}
        </The>
      )}

      <Muc phai={<span className="mo nho">{ds.length} phiếu</span>}>Phiếu đã chấm</Muc>
      {ds.map(p => {
        const kq = p.ok && p.kq ? chamPhieu(bai, docHieuLuc(p), diemTuLuan(p)) : null
        const cb = p.ok && p.kq ? canhBao(p) : []
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
                  {cb.map(w => <div key={w} className="nho" style={{ color: 'var(--red-d)', fontWeight: 600 }}>⚠ {w}</div>)}
                </span>
                <span className="hang" style={{ gap: 10 }}>
                  <b style={{ color: 'var(--green-d)', fontSize: 18 }}>{kq?.coDapAn ? dinhDangDiem(kq.tong) : '—'}</b>
                  <button
                    title="Xóa phiếu này"
                    style={{ border: 0, background: 'none', color: 'var(--red-d)', cursor: 'pointer', padding: 4 }}
                    onClick={e => {
                      e.preventDefault(); e.stopPropagation()
                      const mo = p.ok ? `SBD ${docHieuLuc(p).sbd || '?'} · mã ${docHieuLuc(p).ma || '?'}` : 'không đọc được'
                      if (confirm(`Xóa phiếu số ${p.stt} (${mo})?`)) xoaPhieu(p.id).then(() => setDs(d2 => d2.filter(x => x.id !== p.id)))
                    }}
                  ><Trash2 size={17} /></button>
                </span>
              </div>
            </The>
          </a>
        )
      })}
      {!ds.length && <p className="mo giua khoi">Chưa chấm phiếu nào — bấm “Chấm camera” hoặc “Chấm từ tệp”.</p>}
    </ManHinh>
  )
}
