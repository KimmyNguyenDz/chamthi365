import { useEffect, useMemo, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The, Muc } from '../components/The'
import { dsBai, dsPhieu, layBai } from '../lib/db'
import { chamPhieu, dinhDangDiem, timHocSinh, type KqDiem } from '../lib/diem'
import { docHieuLuc, diemTuLuan } from '../lib/chamKq'
import { vietBangDiemBytes } from '../lib/excel'
import type { Bai, DocCham, Phieu } from '../types'

type Hang = { p: Phieu; doc: DocCham; kq: KqDiem; ten: string; sbdLa: boolean }

function taiTep(bytes: Uint8Array, ten: string) {
  const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url; a.download = ten; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function KetQua({ id }: { id: string }) {
  const [bai, setBai] = useState<Bai | null>(null)
  const [hang, setHang] = useState<Hang[]>([])
  const [loiDs, setLoiDs] = useState<Phieu[]>([])
  const [khong, setKhong] = useState(false)
  const [locMa, setLocMa] = useState('')
  const [sap, setSap] = useState<'stt' | 'diem' | 'ten'>('stt')
  const [xemCau, setXemCau] = useState(false)

  useEffect(() => {
    layBai(id).then(async b => {
      if (!b) { setKhong(true); return }
      setBai(b)
      const ps = await dsPhieu(id)
      const hs: Hang[] = []
      for (const p of ps.filter(x => x.ok && x.kq).sort((a, x) => a.stt - x.stt)) {
        const doc = docHieuLuc(p)
        const kq = chamPhieu(b, doc, diemTuLuan(p))
        const g = timHocSinh(b, doc.sbd)[0]
        hs.push({ p, doc, kq, ten: g?.ten ?? '', sbdLa: !!(b.hocSinh.length && doc.sbd && !b.hocSinh.some(h => h.sbd.replace(/^0+/, '') === doc.sbd.replace(/^0+/, ''))) })
      }
      setHang(hs)
      setLoiDs(ps.filter(x => !x.ok))
    })
  }, [id])

  const loc = useMemo(() => {
    let ds = hang
    if (locMa) ds = ds.filter(h => h.doc.ma === locMa)
    if (sap === 'diem') ds = [...ds].sort((a, b) => b.kq.tong - a.kq.tong)
    if (sap === 'ten') ds = [...ds].sort((a, b) => (a.ten || 'zzz').localeCompare(b.ten || 'zzz', 'vi'))
    return ds
  }, [hang, locMa, sap])

  const tk = useMemo(() => {
    const d = loc.map(h => h.kq.tong)
    if (!d.length) return null
    const sx = [...d].sort((a, b) => a - b)
    return {
      tb: d.reduce((a, b) => a + b, 0) / d.length,
      tv: sx[Math.floor(sx.length / 2)],
      max: sx[sx.length - 1], min: sx[0],
    }
  }, [loc])

  const mas = useMemo(() => [...new Set(hang.map(h => h.doc.ma).filter(Boolean))], [hang])
  const canXem = hang.filter(h => h.p.kq!.can.length > 0).length
  const chuaCham = bai ? bai.hocSinh.length - hang.length : 0

  // Thống kê theo câu: % đúng mỗi câu
  const thongCau = useMemo(() => {
    if (!xemCau || !bai) return null
    const sc = bai.diem.soCau
    const dung = (arr: (boolean | null)[]) => arr.filter(x => x === true).length
    const p1 = Array.from({ length: sc.p1 }, (_, i) => loc.filter(h => h.kq.p1[i]?.dung === true).length)
    const p2 = Array.from({ length: sc.p2 }, (_, i) => loc.filter(h => (h.kq.p2[i]?.y ?? []).every(Boolean)).length)
    const p3 = Array.from({ length: sc.p3 }, (_, i) => loc.filter(h => h.kq.p3[i]?.dung === true).length)
    return { p1, p2, p3, n: loc.length }
  }, [xemCau, loc, bai])

  if (khong) return <ManHinh><p className="mo giua khoi">Bài chấm này không còn trong máy</p></ManHinh>
  if (!bai) return <ManHinh><p className="mo giua khoi">Đang mở…</p></ManHinh>

  return (
    <ManHinh dau={<Dau tieuDe={`Kết quả — ${bai.ten}`} phu={`${hang.length} phiếu`} phai={<NutDen to={`#/bai/${bai.id}`} kieu="nhat" nho>Về bài</NutDen>} />}>
      {tk && (
        <The pang className="khoi">
          <div className="hang" style={{ justifyContent: 'space-around', textAlign: 'center' }}>
            {([['TB', tk.tb], ['Trung vị', tk.tv], ['Cao', tk.max], ['Thấp', tk.min]] as const).map(([t, v]) => (
              <div key={t}><div style={{ font: `800 22px/1 var(--f-head)`, color: 'var(--ink)' }}>{dinhDangDiem(v)}</div><div className="mo nho">{t}</div></div>
            ))}
          </div>
        </The>
      )}

      {(canXem > 0 || loiDs.length > 0 || chuaCham > 0) && (
        <The pang className="khoi">
          {canXem > 0 && <div className="mo nho" style={{ color: 'var(--orange-d)' }}>⚠ {canXem} phiếu còn chỗ cần xem</div>}
          {loiDs.length > 0 && <div className="mo nho" style={{ color: 'var(--red-d)' }}>✗ {loiDs.length} phiếu không đọc được</div>}
          {chuaCham > 0 && <div className="mo nho">· {chuaCham} học sinh chưa có phiếu</div>}
        </The>
      )}

      <div className="hang khoi" style={{ flexWrap: 'wrap' }}>
        <select className="o-vao" style={{ width: 'auto', minHeight: 40 }} value={locMa} onChange={e => setLocMa(e.target.value)}>
          <option value="">Mọi mã đề</option>
          {mas.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="o-vao" style={{ width: 'auto', minHeight: 40 }} value={sap} onChange={e => setSap(e.target.value as never)}>
          <option value="stt">Theo thứ tự</option>
          <option value="diem">Điểm cao → thấp</option>
          <option value="ten">Theo tên</option>
        </select>
        <Nut kieu="nhat" nho onClick={() => setXemCau(v => !v)}>{xemCau ? 'Ẩn thống kê câu' : 'Thống kê theo câu'}</Nut>
        <Nut kieu="xanh" nho onClick={() => taiTep(vietBangDiemBytes(bai, loc.map(h => h.p), d => chamPhieu(bai, d, 0)), `${bai.ten || 'bai'} - bang-diem.xlsx`)}>Xuất Excel</Nut>
      </div>

      {thongCau && (
        <The pang className="khoi">
          <b className="nho">% câu đúng (n={thongCau.n})</b>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(52px,1fr))', gap: 4, marginTop: 6 }}>
            {[
              ...thongCau.p1.map((d, i) => ({ t: `I.${i + 1}`, d })),
              ...thongCau.p2.map((d, i) => ({ t: `II.${i + 1}`, d })),
              ...thongCau.p3.map((d, i) => ({ t: `III.${i + 1}`, d })),
            ].map(c => (
              <div key={c.t} className="giua" style={{ fontSize: 11, background: c.d / thongCau.n >= 0.7 ? 'var(--green-l)' : c.d / thongCau.n >= 0.4 ? 'var(--yellow-l)' : 'var(--red-l)', borderRadius: 8, padding: '4px 2px' }}>
                <b>{c.t}</b><br />{Math.round(c.d / thongCau.n * 100)}%
              </div>
            ))}
          </div>
        </The>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, background: '#fff', borderRadius: 12, overflow: 'hidden', border: 'var(--bo)' }}>
          <thead>
            <tr style={{ background: 'var(--line-2)', fontFamily: 'var(--f-head)' }}>
              <th style={{ padding: '8px 6px', textAlign: 'left' }}>#</th>
              <th style={{ padding: '8px 6px', textAlign: 'left' }}>Họ tên / SBD</th>
              <th style={{ padding: '8px 6px' }}>Mã</th>
              <th style={{ padding: '8px 6px' }}>I</th><th style={{ padding: '8px 6px' }}>II</th><th style={{ padding: '8px 6px' }}>III</th>
              <th style={{ padding: '8px 6px' }}>Điểm</th>
              <th style={{ padding: '8px 6px' }}></th>
            </tr>
          </thead>
          <tbody>
            {loc.map(h => (
              <tr key={h.p.id} style={{ borderTop: '1px solid var(--line)' }}>
                <td style={{ padding: '7px 6px' }} className="mo">{h.p.stt}</td>
                <td style={{ padding: '7px 6px' }}>
                  <b>{h.ten || '—'}</b>
                  <div className="mo" style={{ fontSize: 12 }}>
                    {h.doc.sbd || '?'}{h.sbdLa && <span style={{ color: 'var(--red-d)' }}> · lạ</span>}
                  </div>
                </td>
                <td style={{ padding: '7px 6px', textAlign: 'center' }}>{h.doc.ma || '—'}{!h.kq.coDapAn && <span style={{ color: 'var(--red-d)' }}> !</span>}</td>
                <td style={{ padding: '7px 6px', textAlign: 'center' }}>{dinhDangDiem(h.kq.phan.p1)}</td>
                <td style={{ padding: '7px 6px', textAlign: 'center' }}>{dinhDangDiem(h.kq.phan.p2)}</td>
                <td style={{ padding: '7px 6px', textAlign: 'center' }}>{dinhDangDiem(h.kq.phan.p3)}</td>
                <td style={{ padding: '7px 6px', textAlign: 'center' }}><b style={{ color: 'var(--green-d)' }}>{h.kq.coDapAn ? dinhDangDiem(h.kq.tong) : '—'}</b></td>
                <td style={{ padding: '7px 6px', textAlign: 'center' }}>
                  <a href={`#/phieu/${h.p.id}`}>Xem</a>
                  {h.p.kq!.can.length > 0 && <span style={{ color: 'var(--orange-d)' }}> ⚠</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!loc.length && <p className="mo giua khoi">Chưa có phiếu nào đã chấm.</p>}
      <div className="hang khoi"><NutDen to={`#/cham/${bai.id}`} kieu="xanh">Chấm thêm</NutDen></div>
    </ManHinh>
  )
}

/** Tab Kết quả: chọn bài gần nhất hoặc từ danh sách */
export function KetQuaTab() {
  const [ds, setDs] = useState<Bai[] | null>(null)
  useEffect(() => { dsBai().then(b => setDs(b.sort((a, x) => x.sua - a.sua))) }, [])
  if (ds === null) return <ManHinh><p className="mo giua khoi">Đang mở…</p></ManHinh>
  if (ds.length === 1) return <KetQua id={ds[0].id} />
  return (
    <ManHinh dau={<Dau tieuDe="Kết quả" phu="Chọn bài chấm" />}>
      {ds.length === 0 && <The className="giua khoi"><p className="mo">Chưa có bài chấm nào.</p><NutDen to="#/tao" kieu="xanh">Tạo bài chấm đầu tiên</NutDen></The>}
      {ds.map(b => (
        <a key={b.id} href={`#/bai/${b.id}/ket-qua`} style={{ textDecoration: 'none', color: 'inherit' }}>
          <The pang className="khoi"><b>{b.ten}</b><div className="mo nho">{b.mon} · {b.lop.join(', ')}</div></The>
        </a>
      ))}
    </ManHinh>
  )
}
