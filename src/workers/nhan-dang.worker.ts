/// <reference lib="webworker" />
import { nhanDang, taiDbNhanDang } from '../lib/nhanDang'

const MT = 1600
const V = self as unknown as Worker

V.onmessage = async (n: MessageEvent) => {
  try {
    const c = await taiDbNhanDang().catch(() => {
      throw new Error('Không tải được dữ liệu nhận dạng phiếu — kiểm tra mạng rồi thử lại')
    })
    let { w: t, h: o, buf: r } = n.data
    if (n.data.bmp) {
      const e = n.data.bmp as ImageBitmap
      const a = Math.min(1, MT / Math.max(e.width, e.height))
      t = Math.round(e.width * a); o = Math.round(e.height * a)
      const l = new OffscreenCanvas(t, o)
      const i = l.getContext('2d', { willReadFrequently: true })!
      i.fillStyle = '#fff'; i.fillRect(0, 0, t, o)
      i.drawImage(e, 0, 0, t, o); e.close()
      r = i.getImageData(0, 0, t, o).data.buffer
    }
    const s = nhanDang({ w: t, h: o, d: new Uint8ClampedArray(r) }, c)
    V.postMessage({ ok: true, ...s })
  } catch (c) {
    V.postMessage({ ok: false, loi: String((c as Error)?.message ?? c) })
  }
}
