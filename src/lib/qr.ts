// QR payload Chamthi365 + quét/sinh QR
import QRCode from 'qrcode'
import jsQR from 'jsqr'
import type { Bai, DapAn } from '../types'

// ---------- phiếu ----------
/** CT365:{"v":1,"ma":"0101"[,"sbd":"10010201"]} */
export function payloadPhieuQR(ma: string, sbd?: string): string {
  const o: Record<string, string | number> = { v: 1, ma }
  if (sbd) o.sbd = sbd
  return 'CT365:' + JSON.stringify(o)
}

export function docPayloadPhieu(t: string): { ma?: string; sbd?: string } | null {
  if (!t.startsWith('CT365:')) return null
  try {
    const o = JSON.parse(t.slice(6))
    if (o.v !== 1) return null
    return { ma: typeof o.ma === 'string' ? o.ma : undefined, sbd: typeof o.sbd === 'string' ? o.sbd : undefined }
  } catch { return null }
}

// ---------- đáp án (chia N phần ≤1400 ký tự/QR) ----------
const MAX_QR = 1400
type GoiDa = { v: 1; i: number; n: number; soCau: { p1: number; p2: number; p3: number }; de: DapAn[] }

/** Chia dapAn thành các payload CT365A, mỗi phần ≤1400 ký tự */
export function payloadDapAn(bai: Pick<Bai, 'diem' | 'dapAn'>): string[] {
  const sc = bai.diem.soCau
  const phan: GoiDa[] = []
  let cur: DapAn[] = []
  const dong = () => {
    if (cur.length) phan.push({ v: 1, i: phan.length, n: 0, soCau: sc, de: cur })
    cur = []
  }
  for (const d of bai.dapAn) {
    cur.push(d)
    const s = 'CT365A:' + JSON.stringify({ v: 1, i: phan.length, n: 0, soCau: sc, de: cur } satisfies GoiDa)
    if (s.length > MAX_QR) { cur.pop(); dong(); cur.push(d) }
  }
  dong()
  return phan.map((p, i) => 'CT365A:' + JSON.stringify({ ...p, i, n: phan.length }))
}

export function docPayloadDapAn(t: string): { i: number; n: number; goi: GoiDa } | null {
  if (!t.startsWith('CT365A:')) return null
  try {
    const o = JSON.parse(t.slice(7)) as GoiDa
    if (o.v !== 1 || typeof o.i !== 'number' || typeof o.n !== 'number' || !Array.isArray(o.de)) return null
    return { i: o.i, n: o.n, goi: o }
  } catch { return null }
}

/** Ghép đủ N phần → {soCau, dapAn}; thiếu phần → null */
export function ghepDapAn(parts: Map<number, GoiDa>): { soCau: GoiDa['soCau']; dapAn: DapAn[] } | null {
  const ns = [...parts.values()].map(p => p.n)
  const n = ns[0]
  if (!n || !ns.every(x => x === n) || parts.size < n) return null
  const dapAn: DapAn[] = []
  let soCau = parts.get(0)!.soCau
  for (let i = 0; i < n; i++) dapAn.push(...parts.get(i)!.de)
  return { soCau, dapAn }
}

// ---------- sinh ảnh ----------
/** Data-URL PNG (EC M, margin 4, module scale 8) */
export async function sinhQR(text: string): Promise<string> {
  return QRCode.toDataURL(text, { errorCorrectionLevel: 'M', margin: 4, width: 320 })
}

// ---------- quét ----------
/** BarcodeDetector → jsQR fallback. nhận ImageData / ImageBitmap / video */
export async function quetQR(nguon: ImageData | ImageBitmap | HTMLVideoElement, _stop?: unknown): Promise<string> {
  const BD = (window as unknown as { BarcodeDetector?: new (o?: object) => { detect(s: unknown): Promise<{ rawValue: string }[]> } }).BarcodeDetector
  if (BD) {
    try {
      const kq = await new BD({ formats: ['qr_code'] }).detect(nguon as never)
      if (kq[0]?.rawValue) return kq[0].rawValue
    } catch { }
  }
  const im = nguon instanceof ImageData ? nguon : layImageData(nguon)
  const kq = jsQR(new Uint8ClampedArray(im.data.buffer as ArrayBuffer), im.width, im.height)
  if (kq?.data) return kq.data
  throw new Error('Không thấy mã QR')
}

export function layImageData(nguon: ImageBitmap | HTMLVideoElement): ImageData {
  const w = nguon instanceof HTMLVideoElement ? nguon.videoWidth : nguon.width
  const h = nguon instanceof HTMLVideoElement ? nguon.videoHeight : nguon.height
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  cv.getContext('2d')!.drawImage(nguon as never, 0, 0)
  return cv.getContext('2d')!.getImageData(0, 0, w, h)
}

/** Cắt vùng QR trên ảnh đã nắn về tọa độ khuôn (RGBA), jsQR → payload hoặc null.
 * `heSo` = tỉ lệ ảnh nắn / tọa độ khuôn (vd TILE=2). Thuần JS — chạy được trong worker & node. */
export function docQRVung(
  a: { w: number; h: number; d: Uint8ClampedArray | Uint8Array },
  box: { x: number; y: number; canh: number },
  heSo = 1,
): string | null {
  const le = box.canh * heSo * 0.12
  const x0 = Math.max(0, Math.floor(box.x * heSo - le))
  const y0 = Math.max(0, Math.floor(box.y * heSo - le))
  const x1 = Math.min(a.w, Math.ceil((box.x + box.canh) * heSo + le))
  const y1 = Math.min(a.h, Math.ceil((box.y + box.canh) * heSo + le))
  const w = x1 - x0, h = y1 - y0
  if (w < 20 || h < 20) return null
  const d = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) {
    const src = ((y0 + y) * a.w + x0) * 4
    d.set(a.d.subarray(src, src + w * 4), y * w * 4)
  }
  const kq = jsQR(d, w, h)
  return kq?.data || null
}
