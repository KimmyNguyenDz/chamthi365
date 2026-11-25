import { useEffect, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut } from '../components/Nut'
import { The, Muc } from '../components/The'
import { dsBai, dsLop, luuLop, xoaLop, dangKyThayDoi } from '../lib/db'
import { docDanhSachExcel, vietDanhSachExcelBytes } from '../lib/excel'
import { taiTep } from '../lib/tai'
import { thongBao } from '../lib/thongBao'
import { idMoi } from '../lib/id'
import { Users, FileUp, FileDown, Trash2, Pencil } from 'lucide-react'
import type { Bai, Lop } from '../types'

/** Quản lý danh sách lớp tái sử dụng — nạp 1 lần, dùng cho mọi bài chấm */
export function DanhSach() {
  const [ds, setDs] = useState<Lop[] | null>(null)
  const [bai, setBai] = useState<Bai[]>([])
  const [mo, setMo] = useState<string | null>(null) // id lớp đang xem danh sách
  const [loi, setLoi] = useState('')

  const tai = async () => { setDs(await dsLop()); setBai(await dsBai()) }
  useEffect(() => {
    let s = true
    const taiNeu = async () => { if (s) await tai() }
    taiNeu()
    const bo = dangKyThayDoi(taiNeu)
    return () => { s = false; bo() }
  }, [])

  const napExcel = async (f: File) => {
    try {
      const hs = await docDanhSachExcel(await f.arrayBuffer())
      if (!hs.length) { setLoi('Tệp không có học sinh nào'); return }
      const goc = f.name.replace(/\.(xlsx?|csv)$/i, '')
      const ten = window.prompt('Đặt tên lớp (ví dụ: 10A1):', goc || 'Lớp mới')?.trim()
      if (!ten) return
      const gio = Date.now()
      await luuLop({ id: idMoi(), ten, hocSinh: hs, tao: gio, sua: gio })
      setLoi('')
      thongBao(`Đã lưu lớp ${ten} — ${hs.length} học sinh`)
    } catch (e) { setLoi(String((e as Error)?.message ?? e)) }
  }

  const doiTen = async (l: Lop) => {
    const ten = window.prompt('Đổi tên lớp:', l.ten)?.trim()
    if (!ten || ten === l.ten) return
    await luuLop({ ...l, ten, sua: Date.now() })
    thongBao('Đã đổi tên lớp')
  }

  const xoa = async (l: Lop) => {
    if (!window.confirm(`Xóa lớp "${l.ten}" (${l.hocSinh.length} học sinh)?\nCác bài chấm đã nạp lớp này không bị ảnh hưởng.`)) return
    await xoaLop(l.id)
    thongBao('Đã xóa lớp')
  }

  const capNhat = async (l: Lop, f: File) => {
    try {
      const hs = await docDanhSachExcel(await f.arrayBuffer())
      if (!hs.length) { setLoi('Tệp không có học sinh nào'); return }
      await luuLop({ ...l, hocSinh: hs, sua: Date.now() })
      setLoi('')
      thongBao(`Đã cập nhật lớp ${l.ten} — ${hs.length} học sinh`)
    } catch (e) { setLoi(String((e as Error)?.message ?? e)) }
  }

  return (
    <ManHinh dau={<Dau tieuDe="Danh sách lớp" phu="Nạp 1 lần — chọn lớp khi tạo bài chấm, không cần nạp lại" />}>
      <The pang className="khoi">
        <div className="hang">
          <label className="nut xanh" style={{ cursor: 'pointer', flex: 1, justifyContent: 'center' }}>
            <FileUp /> Nạp Excel lớp mới
            <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) napExcel(f); e.target.value = '' }} />
          </label>
          <Nut kieu="nhat" onClick={() => taiTep(vietDanhSachExcelBytes(), 'danh-sach-lop-mau.xlsx')}><FileDown /> Tải file mẫu</Nut>
        </div>
        <p className="mo nho" style={{ marginBottom: 0 }}>
          Tệp cần cột "SBD" (bắt buộc), "Họ và tên", "Ngày sinh", "Lớp" (tuỳ chọn). File mẫu có sẵn hướng dẫn điền.
        </p>
      </The>
      {loi && <p style={{ color: 'var(--red-d)' }}>{loi}</p>}

      <Muc>Lớp đã lưu</Muc>
      {ds === null ? <p className="mo giua">Đang mở…</p> : !ds.length ? (
        <The className="giua"><p className="mo">Chưa có lớp nào — nạp Excel lớp ở trên để lưu lại dùng cho mọi bài chấm.</p></The>
      ) : ds.map(l => (
        <The key={l.id} className="khoi">
          <div className="hang" style={{ justifyContent: 'space-between' }}>
            <button className="nut nhat nho" style={{ border: 'none', boxShadow: 'none', padding: '4px 0' }} onClick={() => setMo(mo === l.id ? null : l.id)}>
              <Users /> <b>{l.ten}</b>&nbsp;<span className="mo nho">{l.hocSinh.length} HS</span>
            </button>
            <span className="hang" style={{ gap: 6 }}>
              <Nut kieu="nhat" nho title="Đổi tên" onClick={() => doiTen(l)}><Pencil /></Nut>
              <label className="nut nhat nho" style={{ cursor: 'pointer' }} title="Nạp lại danh sách">
                <FileUp />
                <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) capNhat(l, f); e.target.value = '' }} />
              </label>
              <Nut kieu="do" nho title="Xóa lớp" onClick={() => xoa(l)}><Trash2 /></Nut>
            </span>
          </div>
          {mo === l.id && (
            <div style={{ marginTop: 8, borderTop: '1px solid var(--ke)', paddingTop: 8 }}>
              {l.hocSinh.map((h, i) => (
                <div key={h.sbd || i} className="hang" style={{ justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed var(--ke)' }}>
                  <span className="nho"><b>{h.ten || '—'}</b></span>
                  <span className="mo nho">{h.sbd}{h.ngaySinh ? ` · ${h.ngaySinh}` : ''}{h.lop ? ` · ${h.lop}` : ''}</span>
                </div>
              ))}
            </div>
          )}
        </The>
      ))}

      {!!bai.length && (
        <>
          <Muc>Danh sách theo bài chấm</Muc>
          {bai.map(b => (
            <The key={b.id} className="khoi" onClick={() => { location.hash = `#/bai/${b.id}/hoc-sinh` }}>
              <div className="hang" style={{ justifyContent: 'space-between' }}>
                <b>{b.ten}</b>
                <span className="mo nho">{b.hocSinh.length ? `${b.hocSinh.length} HS` : 'chưa có DS'}</span>
              </div>
              <p className="mo nho" style={{ margin: '4px 0 0' }}>{b.mon} · {b.lop.join(', ') || '—'}</p>
            </The>
          ))}
        </>
      )}
    </ManHinh>
  )
}
