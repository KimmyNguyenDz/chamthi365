import { chamAnh, nanAnh, LoiCham } from '../lib/omr'
import { omrKqToKq } from '../lib/docKq'
import type { Khuon, DocCham, CanXem, OCham } from '../types'

export type TinVao = {
  id: string
  w: number
  h: number
  buf?: ArrayBuffer            // RGBA, hoặc
  bmp?: ImageBitmap            // ImageBitmap (camera/PDF) — cần OffscreenCanvas
  khuon: Khuon
  luu?: boolean
}
export type TinRa =
  | {
    id: string; ok: true; ms: number
    doc: DocCham; can: CanXem[]; o: OCham[]; xoay180: boolean
    chatLuong: { doNet: number; khopMoc: number; tongMoc: number; nguong: number; damTo: number }
    anh: Blob | null
  }
  | { id: string; ok: false; ma: string; loi: string; ms: number }

export async function xuLyTin(data: TinVao): Promise<TinRa> {
  const { id, khuon, luu = true } = data
  let { w, h } = data
  const t = performance.now()
  try {
    let buf = data.buf
    if (!buf && data.bmp) {
      const bmp = data.bmp
      const v = Math.min(1, 2400 / Math.max(bmp.width, bmp.height))
      w = Math.round(bmp.width * v); h = Math.round(bmp.height * v)
      const cv = new OffscreenCanvas(w, h)
      const ctx = cv.getContext('2d', { willReadFrequently: true })!
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h)
      ctx.drawImage(bmp, 0, 0, w, h)
      bmp.close()
      buf = ctx.getImageData(0, 0, w, h).data.buffer
    }
    if (!buf) throw new Error('thiếu ảnh đầu vào')
    const d = new Uint8ClampedArray(buf)
    const kq = chamAnh({ w, h, d }, khuon)
    const { chieu, chatLuong } = kq
    const doc = omrKqToKq(kq)
    let anh: Blob | null = null
    if (luu && typeof OffscreenCanvas !== 'undefined') {
      const nan = nanAnh(d, w, h, khuon, chieu)
      const cv = new OffscreenCanvas(nan.w, nan.h)
      cv.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(nan.d), nan.w, nan.h), 0, 0)
      const bl = await cv.convertToBlob({ type: 'image/webp', quality: .72 })
      anh = bl.type === 'image/webp' ? bl : await cv.convertToBlob({ type: 'image/jpeg', quality: .8 })
    }
    return {
      id, ok: true, ms: performance.now() - t,
      doc: doc.doc, can: doc.can, o: doc.o, xoay180: doc.xoay180,
      chatLuong: {
        doNet: chatLuong.doNet, khopMoc: chatLuong.khopMoc,
        tongMoc: chatLuong.tongMoc, nguong: chatLuong.nguong, damTo: chatLuong.damTo,
      },
      anh,
    }
  } catch (err) {
    const ma = err instanceof LoiCham ? err.ma : 'loi'
    const loi = err instanceof LoiCham ? err.message : 'Lỗi khi đọc ảnh: ' + String((err as Error)?.message ?? err)
    return { id, ok: false, ma, loi, ms: performance.now() - t }
  }
}
