import { useEffect, useMemo, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The, Muc } from '../components/The'
import { ChonPhieu } from '../components/ChonPhieu'
import { QuetPhieu } from '../components/QuetPhieu'
import { dsPhieu, layBai, luuBai } from '../lib/db'
import { MAU_DIEM, diemMau } from '../lib/diem'
import { docDanhSachExcel, vietDanhSachExcelBytes } from '../lib/excel'
import { taiTep } from '../lib/tai'
import { thongBao } from '../lib/thongBao'
import { idMoi } from '../lib/id'
import { Camera } from 'lucide-react'
import { mucLuc, nhanCau, tomTat, urlAnh } from '../lib/thuvien'
import type { Bai, Diem, HocSinh, MauPhieu } from '../types'

const MON = ['Toán', 'Vật lí', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Tiếng Anh', 'Lịch sử', 'Địa lí', 'GDCD', 'Tin học', 'KHTN', 'KHXH']

type Hanh = {
  mau: MauPhieu | null
  ten: string; mon: string; lop: string
  boSbd: boolean
  soCau: { p1: number; p2: number; p3: number }
  diem: Diem
  hocSinh: HocSinh[]
}

function OSo({ nhan, v, on, buoc = 0.25, min = 0, max = 99 }: { nhan: string; v: number; on: (n: number) => void; buoc?: number; min?: number; max?: number }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 92, flex: 1 }}>
      <span className="o-nhan" style={{ margin: 0 }}>{nhan}</span>
      <input className="o-vao" type="number" inputMode="decimal" step={buoc} min={min} max={max} value={v}
        onChange={e => { const n = +e.target.value.replace(',', '.'); if (!isNaN(n)) on(n) }} />
    </label>
  )
}

export function TaoBai({ id }: { id?: string }) {
  const [b, setB] = useState<Hanh | null>(null)
  const [buoc, setBuoc] = useState(0)
  const [quet, setQuet] = useState(false)
  const [loi, setLoi] = useState('')
  const [sua, setSua] = useState(false)      // chế độ sửa
  const [khoaMau, setKhoaMau] = useState(false) // đã chấm ≥1 phiếu → khóa đổi mẫu
  const [dangLuu, setDangLuu] = useState(false)

  // Tải bài khi sửa
  useEffect(() => {
    if (!id) return
    ;(async () => {
      const cu = await layBai(id)
      if (!cu) { setLoi('Bài chấm này không còn trong máy'); return }
      setSua(true)
      const daCham = (await dsPhieu(id)).some(p => p.ok)
      setKhoaMau(daCham)
      // mau chỉ có mã — lưu lại mã vào trường phieu; cần MauPhieu đầy đủ → tải mục lục tìm
      const m = (await mucLuc()).find(x => x.ma === cu.phieu) ?? null
      setB({
        mau: m, ten: cu.ten, mon: cu.mon, lop: cu.lop.join(', '), boSbd: !!cu.boSbd,
        soCau: { ...cu.diem.soCau }, diem: { ...cu.diem, p2: [...cu.diem.p2] }, hocSinh: [...cu.hocSinh],
      })
      setBuoc(1)
    })()
  }, [id])

  const m = b?.mau ?? null
  const soCauIn = useMemo(() => (m ? { p1: m.p1, p2: m.p2, p3: m.p3 } : null), [m])

  const chonMau = (x: MauPhieu) => {
    // mặc định theo format đề 2025: 12 câu P.I + 4 câu P.II + 6 câu P.III (không vượt số câu in)
    const soCau = { p1: Math.min(12, x.p1), p2: Math.min(4, x.p2), p3: Math.min(6, x.p3) }
    setB(v => ({
      mau: x, ten: v?.ten ?? '', mon: v?.mon ?? 'Toán', lop: v?.lop ?? '', boSbd: v?.boSbd ?? false,
      soCau, diem: diemMau('toan-2025', soCau), hocSinh: v?.hocSinh ?? [],
    }))
    setQuet(false)
    setBuoc(1)
  }

  const luu = async (v = b) => {
    if (!v?.mau) return
    setDangLuu(true)
    try {
      const cu = id ? await layBai(id) : undefined
      const bai: Bai = {
        id: id ?? idMoi(),
        ten: v.ten.trim() || 'Bài chấm',
        mon: v.mon, lop: v.lop.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean),
        phieu: v.mau.ma, khuon: v.mau.khuon[0].khuon,
        diem: { ...v.diem, soCau: { ...v.soCau } },
        dapAn: cu?.dapAn ?? [], hocSinh: v.hocSinh,
        boSbd: v.boSbd || undefined,
        tao: cu?.tao ?? Date.now(), sua: Date.now(),
      }
      await luuBai(bai)
      location.hash = sua ? `#/bai/${bai.id}` : `#/bai/${bai.id}/dap-an`
    } finally { setDangLuu(false) }
  }

  const napLop = async (f: File) => {
    try {
      const hs = await docDanhSachExcel(await f.arrayBuffer())
      if (!hs.length) { setLoi('Tệp không có học sinh nào'); return }
      const v = b && { ...b, hocSinh: hs }
      setB(v)
      setLoi('')
      // Nạp xong → tự lưu bài và sang màn tiếp theo
      thongBao(`Đã nạp ${hs.length} học sinh`)
      await luu(v)
    } catch (e) { setLoi(String((e as Error)?.message ?? e)) }
  }

  if (loi && !b) return <ManHinh><p className="mo giua khoi">{loi}</p><div className="giua"><NutDen to="#/" kieu="nhat">Về danh sách bài chấm</NutDen></div></ManHinh>
  if (id && !b) return <ManHinh><p className="mo giua khoi">Đang mở…</p></ManHinh>

  const de2 = buoc === 1 && m
  return (
    <ManHinh dau={<Dau tieuDe={sua ? 'Sửa bài chấm' : 'Tạo bài chấm'} phu={`Bước ${buoc + 1} trên 3 · sửa lại được sau`} />}>
      {/* ---------- Bước 1: chọn mẫu phiếu ---------- */}
      {buoc === 0 && (
        <>
          <div className="hang khoi">
            <Nut kieu="nhat" onClick={() => setQuet(true)}><Camera /> Quét phiếu — máy tìm giúp</Nut>
          </div>
          <ChonPhieu chon={m?.ma} onChon={chonMau} />
          {quet && <QuetPhieu onChon={chonMau} onDong={() => setQuet(false)} />}
        </>
      )}

      {/* ---------- Bước 2: thông tin & điểm ---------- */}
      {de2 && m && b && (
        <>
          <The pang className="khoi hang">
            <img src={urlAnh(m)} alt="" style={{ width: 46, height: 62, objectFit: 'cover', border: '2px solid var(--ink)', borderRadius: 8 }} />
            <div style={{ minWidth: 0 }}>
              <b>{m.ten}</b>
              <div className="mo nho">{nhanCau(m)} · {tomTat(m)}</div>
            </div>
            {!khoaMau && <Nut kieu="nhat" nho style={{ marginLeft: 'auto' }} onClick={() => setBuoc(0)}>Đổi</Nut>}
            {khoaMau && <span className="mo nho" style={{ marginLeft: 'auto' }}>Đã chấm — không đổi mẫu</span>}
          </The>

          <Muc>Thông tin</Muc>
          <label className="o-nhan">Tên bài</label>
          <input className="o-vao" value={b.ten} placeholder="Ví dụ: KT 15 phút Toán 10A1" onChange={e => setB({ ...b, ten: e.target.value })} />

          <label className="o-nhan">Môn</label>
          <div className="hang" style={{ flexWrap: 'wrap' }}>
            {MON.map(x => <button key={x} className={`chip ${b.mon === x ? 'bat' : ''}`} onClick={() => setB({ ...b, mon: x })}>{x}</button>)}
          </div>
          <input className="o-vao" style={{ marginTop: 8 }} value={b.mon} placeholder="Hoặc gõ môn khác…" onChange={e => setB({ ...b, mon: e.target.value })} />

          <label className="o-nhan">Lớp (cách nhau dấu phẩy)</label>
          <input className="o-vao" value={b.lop} placeholder="10A1, 10A2…" onChange={e => setB({ ...b, lop: e.target.value })} />

          {m.so_sbd > 0 && (
            <label className="con-tat" style={{ marginTop: 12 }}>
              <input type="checkbox" checked={b.boSbd} onChange={e => setB({ ...b, boSbd: e.target.checked })} />
              Phiếu không có lưới SBD (nhập tên tay khi chấm)
            </label>
          )}

          <Muc>Số câu dùng (≤ số câu in trên phiếu)</Muc>
          <div className="hang">
            <OSo nhan={`Phần I (≤${soCauIn!.p1})`} v={b.soCau.p1} buoc={1} max={soCauIn!.p1} on={n => setB({ ...b, soCau: { ...b.soCau, p1: Math.min(n, soCauIn!.p1) } })} />
            <OSo nhan={`Phần II (≤${soCauIn!.p2})`} v={b.soCau.p2} buoc={1} max={soCauIn!.p2} on={n => setB({ ...b, soCau: { ...b.soCau, p2: Math.min(n, soCauIn!.p2) } })} />
            <OSo nhan={`Phần III (≤${soCauIn!.p3})`} v={b.soCau.p3} buoc={1} max={soCauIn!.p3} on={n => setB({ ...b, soCau: { ...b.soCau, p3: Math.min(n, soCauIn!.p3) } })} />
          </div>

          <Muc>Cách tính điểm</Muc>
          <div className="hang" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
            {MAU_DIEM.map(x => (
              <button key={x.ma} className={`chip ${b.diem.mau === x.ma ? 'bat' : ''}`}
                onClick={() => setB({ ...b, diem: diemMau(x.ma, b.soCau) })}>{x.ten}</button>
            ))}
          </div>
          <div className="hang" style={{ flexWrap: 'wrap' }}>
            <OSo nhan="Điểm câu P.I" v={b.diem.p1} on={n => setB({ ...b, diem: { ...b.diem, p1: n } })} />
            <OSo nhan="Điểm câu P.III" v={b.diem.p3} on={n => setB({ ...b, diem: { ...b.diem, p3: n } })} />
            <OSo nhan="Tự luận" v={b.diem.tuLuan} on={n => setB({ ...b, diem: { ...b.diem, tuLuan: n } })} />
            <OSo nhan="Trừ P.I sai" v={b.diem.truP1} on={n => setB({ ...b, diem: { ...b.diem, truP1: n } })} />
            <OSo nhan="Làm tròn" v={b.diem.lamTron} buoc={0.05} on={n => setB({ ...b, diem: { ...b.diem, lamTron: n } })} />
          </div>
          <p className="mo nho">Phần II theo số ý đúng: {b.diem.p2.map((x, i) => `${i}ý=${x}`).join(' · ')}</p>

          <div className="hang khoi">
            <Nut kieu="nhat" onClick={() => setBuoc(0)}>Bước trước</Nut>
            <Nut kieu="xanh" style={{ flex: 1 }} disabled={!b.ten.trim() && false} onClick={() => setBuoc(2)}>Tiếp</Nut>
          </div>
        </>
      )}

      {/* ---------- Bước 3: danh sách lớp + lưu ---------- */}
      {buoc === 2 && b && (
        <>
          <Muc>Danh sách học sinh (tùy chọn)</Muc>
          <The pang className="khoi">
            {b.hocSinh.length ? (
              <p><b>{b.hocSinh.length}</b> học sinh — ví dụ: {b.hocSinh.slice(0, 3).map(h => h.ten).join(', ')}…</p>
            ) : (
              <p className="mo">Nạp danh sách lớp từ Excel để máy ghi đúng tên em theo số báo danh. Bỏ qua cũng được.</p>
            )}
            <div className="hang">
              <label className="nut nhat" style={{ cursor: 'pointer' }}>
                Nạp Excel lớp
                <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) napLop(f); e.target.value = '' }} />
              </label>
              <Nut kieu="nhat" onClick={() => taiTep(vietDanhSachExcelBytes(), 'danh-sach-lop-mau.xlsx')}>Tải file mẫu</Nut>
            </div>
            <p className="mo nho" style={{ marginBottom: 0 }}>Tệp cần cột “SBD” (bắt buộc), “Họ và tên” và “Lớp” (tuỳ chọn). File mẫu có sẵn hướng dẫn điền.</p>
          </The>
          {loi && <p style={{ color: 'var(--red-d)' }}>{loi}</p>}
          <div className="hang khoi">
            <Nut kieu="nhat" onClick={() => setBuoc(1)}>Bước trước</Nut>
            <Nut kieu="xanh" style={{ flex: 1 }} disabled={dangLuu} onClick={() => luu()}>{dangLuu ? 'Đang lưu…' : sua ? 'Lưu bài chấm' : 'Tạo bài — sang nhập đáp án'}</Nut>
          </div>
        </>
      )}
    </ManHinh>
  )
}
