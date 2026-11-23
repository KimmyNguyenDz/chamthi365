// Đọc PDF bằng pdfjs — render trang ≥200dpi, tách vùng theo clip của khuôn
// pdfjs nạp động: chỉ tải chunk ~400kB khi người dùng thật sự chấm PDF
import type { KhuonTep } from '../types'

export type TrangPdf = { trang: number; bmp: ImageBitmap; wPt: number; hPt: number }

const DPI = 200
let _pdfjs: typeof import('pdfjs-dist') | null = null
async function pdfjs() {
  if (!_pdfjs) {
    _pdfjs = await import('pdfjs-dist')
    _pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()
  }
  return _pdfjs
}

/** Render từng trang PDF thành ImageBitmap (≥200dpi) */
export async function* docPdf(tep: ArrayBuffer): AsyncGenerator<TrangPdf> {
  const p = await pdfjs()
  const doc = await p.getDocument({ data: tep }).promise
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const pg = await doc.getPage(i)
      const vp0 = pg.getViewport({ scale: 1 })
      const ty = Math.max(DPI / 72, 1024 / Math.max(vp0.width, vp0.height))
      const vp = pg.getViewport({ scale: ty })
      const cv = document.createElement('canvas')
      cv.width = Math.floor(vp.width)
      cv.height = Math.floor(vp.height)
      await pg.render({ canvasContext: cv.getContext('2d')!, viewport: vp, canvas: cv } as never).promise
      yield { trang: i - 1, bmp: await createImageBitmap(cv), wPt: vp0.width, hPt: vp0.height }
    }
  } finally { doc.destroy() }
}

/** Đổi clip (pt) sang rect px trên ảnh đã render */
export function clipPx(kt: KhuonTep, wPt: number, hPt: number, wPx: number, hPx: number): [number, number, number, number] {
  if (!kt.clip) return [0, 0, wPx, hPx]
  const sx = wPx / wPt, sy = hPx / hPt
  const [x, y, w, h] = kt.clip
  const m = 2 // chừa mép 2px
  return [Math.max(0, x * sx - m), Math.max(0, y * sy - m), Math.min(wPx, w * sx + 2 * m), Math.min(hPx, h * sy + 2 * m)]
}

/** Test được: trả về danh sách rect [x,y,w,h] px cho 1 trang scan theo các khuonTep của trang đó */
export function tachClip(kts: KhuonTep[], trang: number, wPt: number, hPt: number, wPx: number, hPx: number): { kt: KhuonTep; rect: [number, number, number, number] }[] {
  return kts.filter(k => (k.trang ?? 0) === trang).map(kt => ({ kt, rect: clipPx(kt, wPt, hPt, wPx, hPx) }))
}
