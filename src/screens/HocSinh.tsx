import { useEffect, useMemo, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The, Muc } from '../components/The'
import { dsPhieu, layBai, luuBai } from '../lib/db'
import { docDanhSachExcel, vietDanhSachExcelBytes } from '../lib/excel'
import { taiTep } from '../lib/tai'
import type { Bai, HocSinh } from '../types'

/** Quản lý danh sách lớp của bài: nạp Excel, xem em chưa có phiếu, SBD lạ */
export function HocSinhScr({ id }: { id: string }) {
  const [bai, setBai] = useState<Bai | null>(null)
  const [khong, setKhong] = useState(false)
  const [loi, setLoi] = useState('')
  const [dsSbdCham, setDsSbdCham] = useState<Set<string>>(new Set())

  useEffect(() => {
    layBai(id).then(async b => {
      if (!b) { setKhong(true); return }
      setBai(b)
      const ps = await dsPhieu(id)
      setDsSbdCham(new Set(ps.filter(p => p.ok && p.kq?.doc.sbd).map(p => p.kq!.doc.sbd.replace(/^0+/, ''))))
    })
  }, [id])

  const nap = async (f: File) => {
    try {
      const hs = await docDanhSachExcel(await f.arrayBuffer())
      const moi = { ...bai!, hocSinh: hs, sua: Date.now() }
      await luuBai(moi)
      setBai(moi); setLoi('')
    } catch (e) { setLoi(String((e as Error)?.message ?? e)) }
  }

  const chuaCo = useMemo(() => bai?.hocSinh.filter(h => !dsSbdCham.has(h.sbd.replace(/^0+/, ''))) ?? [], [bai, dsSbdCham])
  const sbdLa = useMemo(() => {
    if (!bai?.hocSinh.length) return []
    const hopLe = new Set(bai.hocSinh.map(h => h.sbd.replace(/^0+/, '')))
    return [...dsSbdCham].filter(s => !hopLe.has(s))
  }, [bai, dsSbdCham])

  if (khong) return <ManHinh><p className="mo giua khoi">Bài chấm này không còn trong máy</p></ManHinh>
  if (!bai) return <ManHinh><p className="mo giua khoi">Đang mở…</p></ManHinh>

  return (
    <ManHinh dau={<Dau tieuDe={`Danh sách — ${bai.ten}`} phu={`${bai.hocSinh.length} học sinh`} phai={<NutDen to={`#/bai/${bai.id}`} kieu="nhat" nho>Về bài</NutDen>} />}>
      <The pang className="khoi">
        <div className="hang">
          <label className="nut xanh" style={{ cursor: 'pointer' }}>
            Nạp Excel lớp
            <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) nap(f); e.target.value = '' }} />
          </label>
          <Nut kieu="nhat" onClick={() => taiTep(vietDanhSachExcelBytes(), 'danh-sach-lop-mau.xlsx')}>Tải file mẫu</Nut>
        </div>
        <p className="mo nho" style={{ marginBottom: 0 }}>Tệp cần cột “SBD” (bắt buộc), “Họ và tên” và “Lớp” (tuỳ chọn). Nạp lại sẽ thay danh sách cũ.</p>
        {loi && <p style={{ color: 'var(--red-d)', marginBottom: 0 }}>{loi}</p>}
      </The>

      {sbdLa.length > 0 && (
        <The pang className="khoi">
          <b style={{ color: 'var(--red-d)' }}>{sbdLa.length} SBD lạ không có trong danh sách</b>
          <div className="mo nho">{sbdLa.join(', ')}</div>
        </The>
      )}

      {chuaCo.length > 0 && (
        <The pang className="khoi">
          <b>{chuaCo.length} em chưa có phiếu:</b>
          <div className="mo nho">{chuaCo.map(h => h.ten).join(' · ')}</div>
        </The>
      )}

      <Muc>Toàn bộ danh sách</Muc>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 8 }}>
        {bai.hocSinh.map(h => (
          <The key={h.sbd} pang>
            <div className="hang" style={{ justifyContent: 'space-between' }}>
              <span><b>{h.ten || '—'}</b><div className="mo nho">{h.sbd}{h.lop ? ` · ${h.lop}` : ''}</div></span>
              {dsSbdCham.has(h.sbd.replace(/^0+/, '')) && <span style={{ color: 'var(--green-d)' }}>✓ đã chấm</span>}
            </div>
          </The>
        ))}
      </div>
      {!bai.hocSinh.length && <p className="mo giua khoi">Chưa có danh sách — nạp Excel lớp ở trên, hoặc bỏ qua (máy vẫn chấm theo SBD tô tay).</p>}
    </ManHinh>
  )
}
