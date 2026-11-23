import { useEffect, useState } from 'react'
import { ManHinh } from '../components/ManHinh'
import { The } from '../components/The'
import { Nut, NutDen } from '../components/Nut'
import { MaQR } from '../components/MaQR'
import { dsBai } from '../lib/db'
import { khuon, mucLuc, tomTat, urlPhieuPdf, locMau, dsHo } from '../lib/thuvien'
import { dsMauQR } from '../lib/phieu-qr/render'
import { renderPhieuPDF } from '../lib/phieu-qr/in'
import { payloadPhieuQR } from '../lib/qr'
import type { Bai, MauPhieu } from '../types'

function taiBlob(b: Blob, ten: string) {
  const u = URL.createObjectURL(b)
  const a = document.createElement('a')
  a.href = u; a.download = ten; a.click()
  setTimeout(() => URL.revokeObjectURL(u), 5000)
}

/** In phiếu QR: chọn mẫu QR + danh sách mã đề (hoặc lấy từ bài chấm) → PDF */
export function InPhieu() {
  const [mau, setMau] = useState<MauPhieu[]>([])
  const [maChon, setMaChon] = useState('')
  const [dsMa, setDsMa] = useState('0101')
  const [dsBaiQR, setDsBaiQR] = useState<Bai[]>([])
  const [baiId, setBaiId] = useState('')
  const [loi, setLoi] = useState('')
  const [tv, setTv] = useState<MauPhieu[]>([])
  const [tim, setTim] = useState('')
  const [ho, setHo] = useState('')

  useEffect(() => {
    const m = dsMauQR()
    setMau(m)
    setMaChon(m[0]?.ma ?? '')
    dsBai().then(bs => setDsBaiQR(bs.filter(b => b.phieu.startsWith('ct365-qr'))))
    mucLuc().then(setTv).catch(() => { })
  }, [])

  const tvLoc = locMau(tv.filter(m => !m.qr), { tim: tim || undefined, ho: ho || undefined }).slice(0, 60)

  const bai = dsBaiQR.find(b => b.id === baiId)
  const dsPhieu: { ma: string; sbd?: string }[] = bai
    ? bai.dapAn.flatMap(d => bai.hocSinh.length ? bai.hocSinh.map(h => ({ ma: d.ma, sbd: h.sbd })) : [{ ma: d.ma }])
    : dsMa.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean).map(ma => ({ ma }))

  const inPdf = async () => {
    try {
      const k = await khuon(bai?.khuon ?? maChon)
      taiBlob(renderPhieuPDF(k, dsPhieu, bai?.ten), `phieu-qr-${dsPhieu.length}.pdf`)
      setLoi('')
    } catch (e) { setLoi(String((e as Error)?.message ?? e)) }
  }

  return (
    <ManHinh dau={<header className="mh-dau"><NutDen to="#/" nho>‹</NutDen><h1>In phiếu QR</h1></header>}>
      <The>
        <h2>Mẫu phiếu QR</h2>
        {dsBaiQR.length > 0 && <>
          <p className="mo">Bài chấm đang dùng phiếu QR:</p>
          <select className="o-vao" value={baiId} onChange={e => setBaiId(e.target.value)}>
            <option value="">— nhập tay —</option>
            {dsBaiQR.map(b => <option key={b.id} value={b.id}>{b.ten} ({b.dapAn.length} mã đề{b.hocSinh.length ? `, ${b.hocSinh.length} HS` : ''})</option>)}
          </select>
        </>}
        {!baiId && <>
          <select className="o-vao" value={maChon} onChange={e => setMaChon(e.target.value)}>
            {mau.map(m => <option key={m.ma} value={m.ma}>{m.ten}</option>)}
          </select>
          <p className="mo">Danh sách mã đề (mỗi dòng 1 mã):</p>
          <textarea className="o-vao" rows={4} value={dsMa} onChange={e => setDsMa(e.target.value)} placeholder={'0101\n0102'} />
        </>}
        <p className="mo">Sẽ in {dsPhieu.length} phiếu (mỗi trang 1 phiếu, QR ghi mã đề{bai?.hocSinh.length ? ' + SBD cá nhân' : ''}).</p>
        {loi && <div className="chip cam">{loi}</div>}
        <Nut kieu="xanh" onClick={inPdf} disabled={!dsPhieu.length}>Tải PDF để in</Nut>
      </The>
      <The>
        <h2>QR mẫu</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <MaQR text={payloadPhieuQR('0101')} size={110} />
          <MaQR text={payloadPhieuQR('0101', '10010201')} size={110} />
        </div>
        <p className="mo">Trái: QR chỉ mã đề. Phải: QR mã đề + SBD cá nhân hoá (máy đọc được cả hai, không đọc được thì chọn mã tay ở màn xem lại).</p>
      </The>

      <The>
        <h2>Thư viện phiếu gốc ({tv.filter(m => !m.qr).length} mẫu)</h2>
        <div className="hang" style={{ flexWrap: 'wrap' }}>
          <input className="o-vao" style={{ flex: 2, minWidth: 140 }} placeholder="Tìm mẫu (tên, họ, số câu)…" value={tim} onChange={e => setTim(e.target.value)} />
          <select className="o-vao" value={ho} onChange={e => setHo(e.target.value)}>
            <option value="">Tất cả họ</option>
            {dsHo(tv).map(h => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
          {tvLoc.map(m => (
            <a key={m.ma} href={urlPhieuPdf(m)} target="_blank" rel="noreferrer" className="hang" style={{ justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 700 }}>{m.ten}</span>
              <span className="mo nho">{tomTat(m)}</span>
            </a>
          ))}
          {!tvLoc.length && <span className="mo">Không có mẫu khớp bộ lọc.</span>}
        </div>
      </The>
    </ManHinh>
  )
}
