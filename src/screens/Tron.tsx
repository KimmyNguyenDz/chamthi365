import { useEffect, useRef, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut } from '../components/Nut'
import { The, Muc } from '../components/The'
import { MaQR } from '../components/MaQR'
import { QuetQRDapAn } from '../components/QuetQRDapAn'
import { docDocx, type DocGoc } from '../lib/tron/docx-doc'
import { parseDe, type De } from '../lib/tron/parse'
import { tronDe } from '../lib/tron/tron'
import { dongGoiZip, vietDapAnDocx, vietDocx } from '../lib/tron/write'
import { vietDapAnExcelBytes } from '../lib/excel'
import { payloadDapAn, sinhQR } from '../lib/qr'
import { luuBai } from '../lib/db'
import { mucLuc } from '../lib/thuvien'
import { diemMau } from '../lib/diem'
import { idMoi } from '../lib/id'
import type { Bai, DapAn } from '../types'

function taiBlob(b: Blob, ten: string) {
  const url = URL.createObjectURL(b)
  const a = document.createElement('a'); a.href = url; a.download = ten; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function Tron() {
  const [goc, setGoc] = useState<DocGoc | null>(null)
  const [de, setDe] = useState<De | null>(null)
  const [ten, setTen] = useState('')
  const [loi, setLoi] = useState('')
  const [chiLoi, setChiLoi] = useState(false)
  const [soDe, setSoDe] = useState(4)
  const [maDau, setMaDau] = useState('101')
  const [canABCD, setCanABCD] = useState(true)
  const [tronYP2, setTronYP2] = useState(true)
  const [chanTrang, setChanTrang] = useState(true)
  const [dangChay, setDangChay] = useState(false)
  const [ketQua, setKetQua] = useState<{ ma: string[] } | null>(null)
  const [qrParts, setQrParts] = useState<string[]>([])
  const [hienQR, setHienQR] = useState(false)
  const [iQR, setIQR] = useState(0)
  const [quetQR, setQuetQR] = useState(false)
  const inp = useRef<HTMLInputElement>(null)

  // Slideshow QR đáp án để máy khác quét được hết các phần
  useEffect(() => {
    if (!hienQR || qrParts.length < 2) return
    const t = setInterval(() => setIQR(i => (i + 1) % qrParts.length), 1400)
    return () => clearInterval(t)
  }, [hienQR, qrParts.length])

  const nap = async (f: File) => {
    setLoi(''); setDe(null); setGoc(null); setKetQua(null)
    try {
      const g = await docDocx(await f.arrayBuffer())
      const d = parseDe(g)
      setGoc(g); setDe(d); setTen(f.name.replace(/\.docx$/i, ''))
      if (d.loi.length) setLoi(d.loi.join(' · '))
    } catch (e) { setLoi(String((e as Error)?.message ?? e)) }
  }

  const chay = async () => {
    if (!goc || !de || dangChay) return
    setDangChay(true)
    try {
      const maList = Array.from({ length: soDe }, (_, i) => String(+maDau + i || i + 1).padStart(maDau.length, '0'))
      const { des, dapAn } = tronDe(de, { soDe, maList, canABCD, tronYP2, tronLoai: false })
      const teps: { ten: string; duLieu: Uint8Array }[] = []
      for (const [i, d] of des.entries())
        teps.push({ ten: `de-${maList[i]}.docx`, duLieu: await vietDocx(d, goc, { maDe: maList[i], chanTrang }) })
      teps.push({ ten: 'bang-dap-an.docx', duLieu: await vietDapAnDocx(des.map((d, i) => ({ ma: maList[i], da: dapAn[i] }))) })
      // excel đáp án nạp thẳng vào bài chấm
      const baiGia = { ten, diem: { soCau: soCauDe(de) }, dapAn } as unknown as Bai
      teps.push({ ten: 'dap-an-nap-app.xlsx', duLieu: vietDapAnExcelBytes(baiGia) })
      // QR đáp án (nhiều phần nếu dài) — quét nạp thẳng vào app
      const parts = payloadDapAn(baiGia)
      setQrParts(parts)
      for (const [i, p] of parts.entries()) {
        const b64 = (await sinhQR(p)).split(',')[1]
        teps.push({ ten: `qr-dap-an-${String(i + 1).padStart(2, '0')}.png`, duLieu: Uint8Array.from(atob(b64), c => c.charCodeAt(0)) })
      }
      await taiBlob(await dongGoiZip(teps), `${ten || 'de'}-tron.zip`)
      setKetQua({ ma: maList })
    } catch (e) { setLoi(String((e as Error)?.message ?? e)) } finally { setDangChay(false) }
  }

  /** Tạo bài chấm mới từ đề đã trộn (mẫu phiếu khớp số câu, nạp sẵn đáp án) */
  const taoBai = async () => {
    if (!de) return
    const sc = soCauDe(de)
    const ml = await mucLuc()
    const mau = ml.find(m => m.p1 >= sc.p1 && m.p2 >= sc.p2 && m.p3 >= sc.p3 && m.so_ma >= (maDau.length || 4))
    const maList = ketQua?.ma ?? Array.from({ length: soDe }, (_, i) => String(+maDau + i).padStart(maDau.length, '0'))
    const { dapAn } = tronDe(de, { soDe: maList.length, maList, canABCD, tronYP2, tronLoai: false })
    const bai: Bai = {
      id: idMoi(), ten: `${ten} (đề trộn)`, mon: 'Toán', lop: [],
      phieu: mau?.ma ?? 'bo-gd-2025-cv-1239-40-08-06', khuon: mau?.khuon[0].khuon ?? '52d461e4',
      diem: diemMau('toan-2025', sc), dapAn, hocSinh: [], tao: Date.now(), sua: Date.now(),
    }
    await luuBai(bai)
    location.hash = `#/bai/${bai.id}`
  }

  const soCauDe = (d: De) => ({
    p1: d.phan.filter(p => p.so === 1).flatMap(p => p.nhom.flatMap(n => n.cau)).length,
    p2: d.phan.filter(p => p.so === 2).flatMap(p => p.nhom.flatMap(n => n.cau)).length,
    p3: d.phan.filter(p => p.so === 3).flatMap(p => p.nhom.flatMap(n => n.cau)).length,
  })

  const cauLoi = de ? de.phan.flatMap(p => p.nhom.flatMap(n => n.cau.filter(c => c.canhBao.length))) : []

  return (
    <ManHinh dau={<Dau tieuDe="Trộn đề Word" phu="Giữ hình · công thức MathType" />}>
      <The pang className="khoi">
        <input ref={inp} type="file" accept=".docx" hidden onChange={e => { const f = e.target.files?.[0]; if (f) nap(f); e.target.value = '' }} />
        <Nut kieu="xanh" style={{ width: '100%' }} onClick={() => inp.current?.click()}>Chọn tệp .docx đề gốc</Nut>
        <p className="mo nho" style={{ marginBottom: 0 }}>
          Quy cách: câu “Câu 1.”, phương án “A. B. C. D.” xuống dòng riêng, đáp án đúng gạch chân hoặc tô đỏ,
          ý đúng/sai “a) b) c) d)”, “Đáp số:” cho Phần III, thẻ nhóm &lt;g0&gt;…&lt;g3&gt;, ghim “*A.”.
        </p>
        {loi && <p style={{ color: 'var(--red-d)', marginBottom: 0 }}>{loi}</p>}
      </The>

      {de && (
        <The pang className="khoi">
          <b>Đề đã đọc: {ten}</b>
          <div className="mo nho">
            {de.phan.map(p => `Phần ${'IIIIIV'[p.so - 1]}: ${p.nhom.flatMap(n => n.cau).length} câu`).join(' · ')}
            {cauLoi.length ? ` · ${cauLoi.length} câu lỗi` : ' · không lỗi'}
          </div>
          {cauLoi.length > 0 && (
            <>
              <label className="con-tat" style={{ marginTop: 6 }}>
                <input type="checkbox" checked={chiLoi} onChange={e => setChiLoi(e.target.checked)} /> Chỉ xem câu lỗi
              </label>
              <div className="nho" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {de.phan.flatMap(p => p.nhom.flatMap(n => n.cau))
                  .filter(c => !chiLoi || c.canhBao.length)
                  .map((c, i) => (
                    <div key={i} className="mo nho" style={{ color: c.canhBao.length ? 'var(--red-d)' : undefined }}>
                      Câu {c.nhan}: {c.canhBao[0] ?? 'ok'}
                    </div>
                  ))}
              </div>
            </>
          )}
        </The>
      )}

      {de && !de.loi.length && (
        <>
          <The pang className="khoi">
            <div className="hang" style={{ flexWrap: 'wrap' }}>
              <label className="hang">Số mã đề <input className="o-vao" type="number" min={1} max={20} value={soDe} onChange={e => setSoDe(+e.target.value || 1)} style={{ width: 64, minHeight: 40 }} /></label>
              <label className="hang">Mã đầu <input className="o-vao" value={maDau} onChange={e => setMaDau(e.target.value)} style={{ width: 80, minHeight: 40 }} /></label>
            </div>
            <label className="con-tat"><input type="checkbox" checked={canABCD} onChange={e => setCanABCD(e.target.checked)} /> Cân số đáp án A B C D</label>
            <label className="con-tat"><input type="checkbox" checked={tronYP2} onChange={e => setTronYP2(e.target.checked)} /> Trộn ý trong câu đúng/sai</label>
            <label className="con-tat"><input type="checkbox" checked={chanTrang} onChange={e => setChanTrang(e.target.checked)} /> Chân trang “Trang x/y - Mã đề”</label>
          </The>
          <div className="hang khoi">
            <Nut kieu="xanh" style={{ flex: 1 }} disabled={dangChay} onClick={chay}>{dangChay ? 'Đang trộn…' : `Trộn ${soDe} mã → tải ZIP`}</Nut>
            <Nut kieu="vang" onClick={taoBai}>Tạo bài chấm từ đề này</Nut>
          </div>
          {ketQua && (
            <>
              <p className="mo giua">Đã tải ZIP gồm {ketQua.ma.length} mã đề ({ketQua.ma.join(', ')}) + bảng đáp án + Excel nạp app.</p>
              <div className="hang khoi">
                <Nut kieu="nhat" nho style={{ flex: 1 }} onClick={() => setHienQR(true)}>Mã QR đáp án</Nut>
                <Nut kieu="nhat" nho style={{ flex: 1 }} onClick={() => setQuetQR(true)}>Quét QR nạp đáp án</Nut>
              </div>
            </>
          )}
        </>
      )}

      {hienQR && qrParts.length > 0 && (
        <div className="nen-phu" onClick={() => setHienQR(false)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 460, width: '100%' }}>
            <The className="khoi">
              <h2>Đáp án QR — phần {iQR + 1}/{qrParts.length}</h2>
              <div className="giua"><MaQR text={qrParts[iQR]} size={280} /></div>
              <p className="mo">Mở Chamthi365 trên máy khác → “Quét QR nạp đáp án” → quét hết {qrParts.length} mã.</p>
              <Nut kieu="nhat" onClick={() => setHienQR(false)}>Đóng</Nut>
            </The>
          </div>
        </div>
      )}
      {quetQR && <QuetQRDapAn onDong={() => setQuetQR(false)} />}
    </ManHinh>
  )
}
