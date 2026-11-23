import { useEffect, useMemo, useRef, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The } from '../components/The'
import { CaiDatCham, useCaiDatCham } from '../components/CaiDatCham'
import { bip, docTo, rung } from '../lib/am-thanh'
import { dsPhieu, layBai, luuPhieu, xoaPhieu, datMeta, layMeta } from '../lib/db'
import { chamPhieu, dinhDangDiem, timHocSinh } from '../lib/diem'
import { idMoi } from '../lib/id'
import { taoBoMayCham } from '../lib/mayCham'
import { ngam, toanBoO, type KqNgam } from '../lib/ngam'
import { khuon as taiKhuon } from '../lib/thuvien'
import type { Bai, Khuon, Phieu } from '../types'

const loiCam = (e: unknown) => {
  const n = (e as DOMException)?.name
  if (n === 'NotAllowedError' || n === 'SecurityError') return 'Chưa cho quyền camera — bấm biểu tượng khóa trên thanh địa chỉ, Cho phép rồi tải lại.'
  if (n === 'NotFoundError' || n === 'OverconstrainedError') return 'Không thấy camera trên máy này.'
  if (n === 'NotReadableError' || n === 'AbortError') return 'Camera đang bị ứng dụng khác giữ — đóng app kia rồi thử lại.'
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return 'Chụp bằng camera cần chạy HTTPS (hoặc localhost).'
  return 'Không mở được camera: ' + String((e as Error)?.message ?? e)
}

type VuaCham = { phieu: Phieu; ten?: string; diem: number | null; thay: boolean }

export function Camera({ id }: { id: string }) {
  const [bai, setBai] = useState<Bai | null>(null)
  const [khuon, setKhuon] = useState<Khuon | null>(null)
  const [loi, setLoi] = useState('')
  const [kq, setKq] = useState<KqNgam | null>(null)
  const [vua, setVua] = useState<VuaCham | null>(null)
  const [soPhieu, setSoPhieu] = useState(0)
  const [moCd, setMoCd] = useState(false)
  const [den, setDen] = useState(false)
  const [cd, datCd] = useCaiDatCham()

  const videoRef = useRef<HTMLVideoElement>(null)
  const ovRef = useRef<HTMLCanvasElement>(null)
  const cvRef = useRef<HTMLCanvasElement | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const demRef = useRef(0)
  const gocTruocRef = useRef<number[][] | null>(null)
  const banChamRef = useRef(false)
  const sttRef = useRef(0)
  const boMayRef = useRef<ReturnType<typeof taoBoMayCham> | null>(null)
  const songRef = useRef(true)
  const khuonRef = useRef<Khuon | null>(null)
  const baiRef = useRef<Bai | null>(null)
  const cdRef = useRef(cd)
  cdRef.current = cd
  khuonRef.current = khuon
  baiRef.current = bai

  const dsHs = useMemo(() => new Set((bai?.hocSinh ?? []).map(h => h.sbd.replace(/^0+/, ''))), [bai])

  // Tải bài + khuôn + mở camera
  useEffect(() => {
    songRef.current = true
    let stream: MediaStream | null = null
    ;(async () => {
      const b = await layBai(id)
      if (!b) { setLoi('Bài chấm này không còn trong máy'); return }
      setBai(b)
      sttRef.current = (await dsPhieu(id)).reduce((m, p) => Math.max(m, p.stt), 0)
      setSoPhieu((await dsPhieu(id)).length)
      const k = await taiKhuon(b.khuon)
      setKhuon(k)
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        })
      } catch (e) { setLoi(loiCam(e)); return }
      const v = videoRef.current
      if (!v) return
      v.srcObject = stream
      trackRef.current = stream.getVideoTracks()[0]
      await v.play().catch(() => {})
    })()
    boMayRef.current ??= taoBoMayCham()
    return () => {
      songRef.current = false
      stream?.getTracks().forEach(t => t.stop())
    }
  }, [id])

  // Đèn pin
  useEffect(() => {
    trackRef.current?.applyConstraints({ advanced: [{ torch: den } as MediaTrackConstraintSet] }).catch(() => {})
  }, [den])

  // Vòng lặp ngắm
  useEffect(() => {
    if (!khuon || !bai) return
    const cv = (cvRef.current ??= document.createElement('canvas'))
    const cx = cv.getContext('2d', { willReadFrequently: true })!
    const os = toanBoO(khuon)
    let idf = 0

    const tick = async () => {
      if (!songRef.current) return
      const v = videoRef.current, k = khuonRef.current, b = baiRef.current
      if (!v || !v.videoWidth || !k || !b) return
      const ty = Math.min(1, 1024 / Math.max(v.videoWidth, v.videoHeight))
      const w = Math.round(v.videoWidth * ty), h = Math.round(v.videoHeight * ty)
      cv.width = w; cv.height = h
      cx.drawImage(v, 0, 0, w, h)
      const im = cx.getImageData(0, 0, w, h)
      let r: KqNgam
      try {
        r = ngam(k, os, `f${idf++}`, w, h, new Uint8ClampedArray(im.data.buffer as ArrayBuffer))
      } catch { return }
      setKq(r)

      // vẽ overlay
      const ov = ovRef.current
      if (ov) {
        const ox = ov.getContext('2d')!
        const sx = ov.width / w, sy = ov.height / h
        ox.clearRect(0, 0, ov.width, ov.height)
        if (r.goc) {
          ox.beginPath()
          r.goc.forEach(([x, y], i) => (i ? ox.lineTo(x * sx, y * sy) : ox.moveTo(x * sx, y * sy)))
          ox.closePath()
          ox.strokeStyle = 'rgba(54,196,107,.95)'
          ox.lineWidth = 4
          ox.stroke()
          ox.fillStyle = 'rgba(54,196,107,.12)'
          ox.fill()
        }
        for (const [x, y] of r.vuong.slice(0, 8)) {
          ox.beginPath(); ox.arc(x * sx, y * sy, 5, 0, 7); ox.fillStyle = 'rgba(255,207,63,.8)'; ox.fill()
        }
      }

      // đứng yên → chụp
      if (r.goc && cdRef.current.tuChup && !banChamRef.current) {
        const gt = gocTruocRef.current
        const dich = gt ? Math.max(...r.goc.map((p, i) => Math.hypot(p[0] - gt[i][0], p[1] - gt[i][1]))) : 999
        const duNet = cdRef.current.doNhay === 'nhanh' ? true : r.net > 6
        demRef.current = dich < 6 && duNet ? demRef.current + 1 : 0
        gocTruocRef.current = r.goc.map(p => [...p])
        if (demRef.current >= (cdRef.current.doNhay === 'nhanh' ? 2 : 3)) {
          demRef.current = 0
          chup()
        }
      } else gocTruocRef.current = null
    }

    const t = setInterval(tick, 140)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [khuon, bai])

  const chup = async () => {
    const v = videoRef.current, k = khuonRef.current, b = baiRef.current, bm = boMayRef.current
    if (!v || !v.videoWidth || !k || !b || !bm || banChamRef.current) return
    banChamRef.current = true
    try {
      const cv = document.createElement('canvas')
      const w = Math.min(v.videoWidth, 2000)
      const ty = w / v.videoWidth
      const h = Math.round(v.videoHeight * ty)
      cv.width = w; cv.height = h
      cv.getContext('2d')!.drawImage(v, 0, 0, w, h)
      const im = cv.getContext('2d')!.getImageData(0, 0, w, h)
      const buf = im.data.buffer.slice(0) as ArrayBuffer
      const r = await bm.cham({ w, h, buf }, k, true)
      if (!r.ok || !r.doc) { bip(true); return }
      const phieu: Phieu = {
        id: idMoi(), baiId: b.id, stt: ++sttRef.current, nguon: 'cam', luc: Date.now(),
        ok: true, kq: { doc: r.doc, can: r.can ?? [], o: r.o ?? [], xoay180: r.xoay180 },
        sua: {},
      }
      // trùng SBD → thay kết quả cũ
      let thay = false
      const sbdMoi = r.doc.sbd?.replace(/^0+/, '')
      if (sbdMoi) {
        for (const p of await dsPhieu(b.id)) {
          if (p.ok && p.kq?.doc.sbd?.replace(/^0+/, '') === sbdMoi && p.id !== phieu.id) {
            await xoaPhieu(p.id)
            phieu.sua.thayThe = p.id
            thay = true
            break
          }
        }
      }
      await luuPhieu(phieu)
      const diemKq = chamPhieu(b, phieu.kq!.doc, 0)
      const g = timHocSinh(b, phieu.kq!.doc.sbd, dsHs)[0]
      setVua({ phieu, ten: g?.ten, diem: diemKq.coDapAn ? diemKq.tong : null, thay })
      setSoPhieu(x => x + (thay ? 0 : 1))
      const c = cdRef.current
      if (c.beep) bip()
      if (c.rung) rung()
      if (c.docDiem) docTo(diemKq.coDapAn ? `${dinhDangDiem(diemKq.tong)} điểm` : 'chưa có đáp án')
      if (!c.hienKq) setTimeout(() => setVua(null), 1200)
    } catch (e) {
      setLoi('Máy chấm gặp sự cố (có thể ảnh quá lớn): thử lại tờ này')
      bip(true)
    } finally { banChamRef.current = false }
  }

  const hs = vua ? timHocSinh(bai!, vua.phieu.kq!.doc.sbd, dsHs)[0] : null

  return (
    <ManHinh tab={false} dau={
      <Dau tieuDe={bai?.ten ?? 'Chấm phiếu'} phu={`${soPhieu} phiếu`} phai={
        <>
          <Nut kieu="nhat" nho onClick={() => setDen(d => !d)} title="Đèn pin">🔦</Nut>
          <Nut kieu="nhat" nho onClick={() => setMoCd(true)} title="Cài đặt chấm">⚙</Nut>
        </>
      } />
    }>
      {loi ? (
        <The className="giua khoi"><p style={{ color: 'var(--red-d)' }}>{loi}</p><NutDen to={`#/bai/${id}`} kieu="nhat">Về bài chấm</NutDen></The>
      ) : (
        <>
          <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', border: 'var(--bo)', background: '#000' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', display: 'block' }}
              onLoadedMetadata={e => {
                const v = e.currentTarget
                const ov = ovRef.current
                if (ov) { ov.width = v.clientWidth; ov.height = v.clientHeight }
              }} />
            <canvas ref={ovRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
            <div className="chip" style={{ position: 'absolute', top: 10, left: 10, background: kq?.goc ? 'var(--green-l)' : '#fff' }}>
              {kq?.goc ? `Thấy phiếu · khớp ${kq.khop}/${kq.tong} mốc` : 'Chưa thấy phiếu'}
            </div>
            {kq?.goc && cd.tuChup && <div className="chip" style={{ position: 'absolute', top: 10, right: 10, background: 'var(--green-l)' }}>Giữ yên…</div>}
          </div>

          <p className="mo nho giua" style={{ margin: '8px 0' }}>
            {kq?.goc ? 'Phiếu đứng yên là máy tự chụp, không cần bấm nút' : 'Đưa đủ 4 ô vuông đen ở 4 góc phiếu vào khung'}
          </p>

          <div className="hang khoi">
            <Nut kieu="xanh" style={{ flex: 1 }} onClick={chup}>Chụp chấm</Nut>
            <NutDen to={`#/cham/${id}?tep=1`} kieu="nhat">Tệp ảnh/PDF</NutDen>
            <NutDen to={`#/bai/${id}`} kieu="nhat">Xong</NutDen>
          </div>
        </>
      )}

      {vua && (
        <div onClick={() => setVua(null)} style={{ position: 'fixed', inset: 0, zIndex: 70, background: '#0008', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
          <The className="giua" pang={false}>
            <div onClick={e => e.stopPropagation()} style={{ maxWidth: 380, width: '90vw' }}>
              <div className="giua">
                <div style={{ font: `800 44px/1 var(--f-head)`, color: 'var(--green-d)' }}>
                  {vua.diem != null ? dinhDangDiem(vua.diem) : '—'}
                </div>
                <div className="mo">điểm{vua.diem == null ? ' (chưa có đáp án)' : ''}</div>
                <h2 style={{ marginTop: 6 }}>{hs?.ten ?? 'SBD ' + (vua.phieu.kq!.doc.sbd || '?')}</h2>
                <div className="mo nho">Mã đề {vua.phieu.kq!.doc.ma || '?'} · Phiếu số {vua.phieu.stt}{vua.thay ? ' · đã thay kết quả cũ' : ''}</div>
                {vua.phieu.kq!.can.length > 0 && (
                  <p className="chip" style={{ borderColor: 'var(--orange-d)', background: 'var(--orange-l)', margin: '8px auto' }}>
                    {vua.phieu.kq!.can.length} chỗ cần xem — bấm ô cam để xác nhận
                  </p>
                )}
                <div className="hang giua" style={{ justifyContent: 'center', marginTop: 8 }}>
                  <NutDen to={`#/phieu/${vua.phieu.id}`} kieu="vang">Xem phiếu</NutDen>
                  <Nut kieu="xanh" onClick={() => setVua(null)}>Chấm tiếp ✕</Nut>
                </div>
              </div>
            </div>
          </The>
        </div>
      )}

      {moCd && <CaiDatCham cd={cd} dat={datCd} onDong={() => setMoCd(false)} />}
    </ManHinh>
  )
}
