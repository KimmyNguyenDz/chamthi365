import { useEffect, useMemo, useRef, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The, Muc } from '../components/The'
import { NhapDapAn } from '../components/NhapDapAn'
import { MaQR } from '../components/MaQR'
import { QuetQR } from '../components/QuetQR'
import { layBai, luuBai } from '../lib/db'
import { docDapAnChuoi, docDapAnExcel, docDapAnQM, vietDapAnExcelBytes } from '../lib/excel'
import { thongBao } from '../lib/thongBao'
import { docPayloadDapAn, ghepDapAn, payloadDapAn } from '../lib/qr'
import { AlertTriangle } from 'lucide-react'
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
  const [hienQR, setHienQR] = useState(false)
  const [quetQR, setQuetQR] = useState(false)
  const [iQR, setIQR] = useState(0)
  const cacPhan = useRef(new Map<number, NonNullable<ReturnType<typeof docPayloadDapAn>>['goi']>())

  // Slideshow QR đáp án: nhảy phần mỗi 1.4s để máy khác quét được hết
  const parts = useMemo(() => (hienQR && bai ? payloadDapAn(bai) : []), [hienQR, bai])
  useEffect(() => {
    if (!hienQR || parts.length < 2) return
    const t = setInterval(() => setIQR(i => (i + 1) % parts.length), 1400)
    return () => clearInterval(t)
  }, [hienQR, parts.length])

  const khiQuetQR = (t: string) => {
    const d = docPayloadDapAn(t)
    if (d) {
      cacPhan.current.set(d.i, d.goi)
      if (cacPhan.current.size >= d.n) {
        const g = ghepDapAn(cacPhan.current)
        if (g && bai) {
          const map = new Map(bai.dapAn.map(x => [x.ma, x]))
          for (const x of g.dapAn) map.set(x.ma, x)
          const ds = [...map.values()]
          setBai({ ...bai, dapAn: ds }); setChon(ds[0]?.ma ?? null); setLoi('')
        }
        setQuetQR(false); cacPhan.current.clear()
      } else {
        setLoi(`Đã quét phần ${cacPhan.current.size}/${d.n} — quét tiếp QR khác`)
      }
      return
    }
    // QR app QM / QR ghi chuỗi đáp án bất kỳ
    if (bai && napTuChuoiQR(t)) { setQuetQR(false); return }
    setLoi('QR này không chứa đáp án — cần QR Chamthi365, QR app QM hoặc QR ghi chuỗi đáp án (vd “0101 ABCD ĐSĐS 0,5;1”)')
    setQuetQR(false)
  }

  /** Parse nội dung QR/dán: format QM JSON [[..]] → nhiều mã; chuỗi đơn → 1 mã. Trả true nếu nạp được */
  const napTuChuoiQR = (t: string): boolean => {
    if (!bai) return false
    const qm = docDapAnQM(t, bai.diem.soCau)
    if (qm) {
      const map = new Map(bai.dapAn.map(x => [x.ma, x]))
      for (const x of qm) map.set(x.ma, x)
      const ds = [...map.values()]
      setBai({ ...bai, dapAn: ds }); setChon(ds[0]?.ma ?? null); setLoi('')
      thongBao(`Đã nạp ${qm.length} mã đề từ QR`)
      return true
    }
    try {
      const da = docDapAnChuoi(t, bai.diem.soCau)
      if (!da.ma) return false
      const co = bai.dapAn.some(x => x.ma === da.ma)
      setBai({ ...bai, dapAn: co ? bai.dapAn.map(x => (x.ma === da.ma ? da : x)) : [...bai.dapAn, da] })
      setChon(da.ma); setLoi('')
      return true
    } catch { return false }
  }

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
    if (t.startsWith('[[')) { if (napTuChuoiQR(t)) setDan(''); else setLoi('Không đọc được format đáp án QM'); return }
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
          <Nut kieu="nhat" nho onClick={() => { setIQR(0); setHienQR(true) }} disabled={!bai.dapAn.length}>Mã QR</Nut>
          <Nut kieu="nhat" nho onClick={() => { cacPhan.current.clear(); setQuetQR(true) }}>Quét QR nạp</Nut>
        </div>
        {loi && <p style={{ color: 'var(--red-d)', marginBottom: 0 }}>{loi}</p>}
        {trung.map(([a, c]) => <p key={a + c} className="trang-thai cam" style={{ marginBottom: 0 }}><AlertTriangle size={15} /> Mã {a} và {c} giống hệt Phần I — kiểm tra lại có nhập nhầm không.</p>)}
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

      {hienQR && parts.length > 0 && (
        <div className="nen-phu" onClick={() => setHienQR(false)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: '100%' }}>
            <The className="khoi">
              <h2>Đáp án QR — phần {iQR + 1}/{parts.length}</h2>
              <div className="giua"><MaQR text={parts[iQR]} size={280} /></div>
              <p className="mo">Mở Chamthi365 trên máy khác → “Quét QR nạp” → quét hết {parts.length} mã.</p>
              <Nut kieu="nhat" onClick={() => setHienQR(false)}>Đóng</Nut>
            </The>
          </div>
        </div>
      )}
      {quetQR && (
        <div className="nen-phu" onClick={() => setQuetQR(false)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: '100%' }}>
            <The className="khoi">
              <h2>Quét QR đáp án</h2>
              <p className="mo nho">Hỗ trợ QR Chamthi365 (nhiều phần quét liên tiếp) hoặc QR bất kỳ ghi sẵn chuỗi đáp án, vd “0101 ABCD ĐSĐS 0,5;1”. Chụp trực tiếp hoặc chọn ảnh QR có sẵn.</p>
              <QuetQR onKq={khiQuetQR} onDong={() => setQuetQR(false)} />
            </The>
          </div>
        </div>
      )}
    </ManHinh>
  )
}
