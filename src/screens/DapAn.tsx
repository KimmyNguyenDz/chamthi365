import { useEffect, useMemo, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The, Muc } from '../components/The'
import { NhapDapAn } from '../components/NhapDapAn'
import { layBai, luuBai } from '../lib/db'
import { docDapAnChuoi, docDapAnExcel, vietDapAnExcelBytes } from '../lib/excel'
import type { Bai, DapAn } from '../types'

function taiTep(bytes: Uint8Array, ten: string) {
  const url = URL.createObjectURL(new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
  const a = document.createElement('a')
  a.href = url; a.download = ten; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export function DapAnScr({ id }: { id: string }) {
  const [bai, setBai] = useState<Bai | null>(null)
  const [chon, setChon] = useState<string | null>(null)
  const [dan, setDan] = useState('')
  const [loi, setLoi] = useState('')
  const [khong, setKhong] = useState(false)

  useEffect(() => {
    layBai(id).then(b => {
      if (!b) { setKhong(true); return }
      setBai(b)
      setChon(b.dapAn[0]?.ma ?? null)
    })
  }, [id])

  const da = useMemo(() => bai?.dapAn.find(d => d.ma === chon) ?? null, [bai, chon])
  // Cảnh báo 2 mã trùng hệt P1 (rất hay là nhập nhầm)
  const trung = useMemo(() => {
    if (!bai) return [] as [string, string][]
    const v: [string, string][] = []
    for (let i = 0; i < bai.dapAn.length; i++) for (let j = i + 1; j < bai.dapAn.length; j++) {
      const a = bai.dapAn[i], c = bai.dapAn[j]
      if (a.p1.length && a.p1.join() === c.p1.join()) v.push([a.ma, c.ma])
    }
    return v
  }, [bai])

  if (khong) return <ManHinh><p className="mo giua khoi">Bài chấm này không còn trong máy</p><div className="giua"><NutDen to="#/" kieu="nhat">Về danh sách bài chấm</NutDen></div></ManHinh>
  if (!bai) return <ManHinh><p className="mo giua khoi">Đang mở…</p></ManHinh>

  const setDa = (d: DapAn) => setBai({ ...bai, dapAn: bai.dapAn.map(x => (x.ma === d.ma ? d : x)) })
  const themMa = () => {
    const ma = dan.trim()
    if (!ma) return
    if (bai.dapAn.some(d => d.ma === ma)) { setChon(ma); setDan(''); return }
    setBai({ ...bai, dapAn: [...bai.dapAn, { ma, p1: [], p2: [], p3: [] }] })
    setChon(ma); setDan('')
  }
  const xoaMa = (ma: string) => {
    const ds = bai.dapAn.filter(d => d.ma !== ma)
    setBai({ ...bai, dapAn: ds })
    if (chon === ma) setChon(ds[0]?.ma ?? null)
  }
  const danChuoi = () => {
    const t = dan.trim()
    if (!t) return
    try {
      const d = docDapAnChuoi(t, bai.diem.soCau)
      if (!d.ma) { setLoi('Chuỗi thiếu mã đề ở đầu'); return }
      const co = bai.dapAn.some(x => x.ma === d.ma)
      setBai({ ...bai, dapAn: co ? bai.dapAn.map(x => (x.ma === d.ma ? d : x)) : [...bai.dapAn, d] })
      setChon(d.ma); setDan(''); setLoi('')
    } catch (e) { setLoi(String((e as Error)?.message ?? e)) }
  }
  const napExcel = async (f: File) => {
    try {
      const { dapAn } = await docDapAnExcel(await f.arrayBuffer())
      if (!dapAn.length) { setLoi('Tệp không có mã đề nào'); return }
      const map = new Map(bai.dapAn.map(d => [d.ma, d]))
      for (const d of dapAn) map.set(d.ma, d)
      const ds = [...map.values()]
      setBai({ ...bai, dapAn: ds }); setChon(ds[0]?.ma ?? null); setLoi('')
    } catch (e) { setLoi(String((e as Error)?.message ?? e)) }
  }
  const luu = async () => {
    await luuBai({ ...bai, sua: Date.now() })
    location.hash = `#/bai/${bai.id}`
  }

  const { p1, p2, p3 } = bai.diem.soCau
  return (
    <ManHinh dau={<Dau tieuDe={`Đáp án — ${bai.ten}`} phu={`${p1} câu I · ${p2} câu II · ${p3} câu III`} />}>
      <The pang className="khoi">
        <div className="hang" style={{ flexWrap: 'wrap' }}>
          <input className="o-vao" style={{ flex: 2, minWidth: 130 }} placeholder="Dán chuỗi: 0101 ABCD ĐSĐS 0,5;1 — hoặc gõ mã đề để thêm"
            value={dan} onChange={e => setDan(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') (dan.trim().split(/\s+/).length > 1 ? danChuoi() : themMa()) }} />
          <Nut kieu="nhat" nho onClick={() => (dan.trim().split(/\s+/).length > 1 ? danChuoi() : themMa())}>Thêm / Dán</Nut>
          <label className="nut nhat nho" style={{ cursor: 'pointer' }}>
            Nạp Excel
            <input type="file" accept=".xlsx,.xls" hidden onChange={e => { const f = e.target.files?.[0]; if (f) napExcel(f); e.target.value = '' }} />
          </label>
          <Nut kieu="nhat" nho onClick={() => taiTep(vietDapAnExcelBytes(bai, true), `${bai.ten || 'bai'} - dap-an.xlsx`)}>Tải Excel mẫu</Nut>
        </div>
        {loi && <p style={{ color: 'var(--red-d)', marginBottom: 0 }}>{loi}</p>}
        {trung.map(([a, c]) => <p key={a + c} style={{ color: 'var(--orange-d)', marginBottom: 0 }}>⚠ Mã {a} và {c} giống hệt Phần I — kiểm tra lại có nhập nhầm không.</p>)}
      </The>

      <Muc phai={<span className="mo nho">{bai.dapAn.length} mã</span>}>Mã đề</Muc>
      <div className="hang" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
        {bai.dapAn.map(d => (
          <span key={d.ma} className={`chip ${chon === d.ma ? 'bat' : ''}`} onClick={() => setChon(d.ma)}>
            {d.ma}
            <button onClick={e => { e.stopPropagation(); xoaMa(d.ma) }} style={{ border: 0, background: 'none', color: 'var(--red-d)', cursor: 'pointer', fontWeight: 800, padding: '0 2px' }}>×</button>
          </span>
        ))}
        {!bai.dapAn.length && <span className="mo">Chưa có mã đề — thêm mã, dán chuỗi hoặc nạp Excel ở trên.</span>}
      </div>

      {da && (
        <The className="khoi">
          <h2 style={{ marginBottom: 6 }}>Mã đề {da.ma}</h2>
          <NhapDapAn soCau={bai.diem.soCau} value={da} onChange={setDa} />
        </The>
      )}

      <div className="hang khoi">
        <NutDen to={`#/bai/${bai.id}`} kieu="nhat">Hủy</NutDen>
        <Nut kieu="xanh" style={{ flex: 1 }} onClick={luu}>Lưu đáp án</Nut>
      </div>
    </ManHinh>
  )
}
