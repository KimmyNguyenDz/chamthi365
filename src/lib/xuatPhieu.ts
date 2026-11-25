// Xuất ảnh phiếu đã chấm ra PNG: header điểm + ảnh nắn + vòng tô màu đúng/sai
import type { KqCham, OCham } from '../types'

export const MAU_CHAM: Record<OCham['trangThai'], string> = {
  dung: '#2fae60', sai: '#e2444f', mo: '#f08a1d', xam: '#9aa0bd',
  tay: '#3a8ef0', trung: '#e6b800', trong: '#d5daea',
}

/** Phiếu đã chấm → PNG: dòng đầu là tên/SBD/mã/điểm, dưới là ảnh phiếu có vòng màu */
export async function anhPhieuCham(anh: Blob, kq: KqCham, trang: [number, number], dongTieu: string[]): Promise<Blob> {
  const [w, h] = trang
  const caoDau = Math.max(64, Math.round(w * 0.085))
  const bmp = await createImageBitmap(anh)
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h + caoDau
  const c = cv.getContext('2d')!
  c.fillStyle = '#ffffff'
  c.fillRect(0, 0, w, h + caoDau)
  c.fillStyle = '#1b2340'
  c.font = `800 ${Math.round(caoDau * 0.32)}px sans-serif`
  c.fillText(dongTieu[0] ?? '', 22, caoDau * 0.40, w - 44)
  c.font = `500 ${Math.round(caoDau * 0.21)}px sans-serif`
  c.fillStyle = '#5a6280'
  c.fillText(dongTieu[1] ?? '', 22, caoDau * 0.80, w - 44)
  c.strokeStyle = '#d5daea'
  c.lineWidth = 2
  c.beginPath(); c.moveTo(0, caoDau - 2); c.lineTo(w, caoDau - 2); c.stroke()
  c.drawImage(bmp, 0, caoDau, w, h)
  for (const o of kq.o) {
    if (!o.to && o.trangThai === 'trong') continue
    const mau = MAU_CHAM[o.trangThai]
    const r = (o.r ?? 8) * 1.6
    c.beginPath()
    c.arc(o.x, o.y + caoDau, r, 0, Math.PI * 2)
    c.lineWidth = Math.max(2, (o.r ?? 8) * 0.2)
    c.strokeStyle = mau
    c.stroke()
    if (o.to) {
      c.globalAlpha = 0.72
      c.fillStyle = mau
      c.fill()
      c.globalAlpha = 1
    }
  }
  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('Không vẽ được ảnh'))), 'image/png'))
}
