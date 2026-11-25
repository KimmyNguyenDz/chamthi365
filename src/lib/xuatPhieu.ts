// Xuất ảnh phiếu đã chấm ra PNG: header điểm + ảnh nắn + nét bút chữa đúng/sai
import type { DapAn, DocCham, Khuon, KqCham, OCham } from '../types'
import type { KqDiem } from './diem'
import { dsCham } from './chiTiet'

export const MAU_CHAM: Record<OCham['trangThai'], string> = {
  dung: '#2fae60', sai: '#e2444f', mo: '#f08a1d', xam: '#9aa0bd',
  tay: '#3a8ef0', trung: '#e6b800', trong: '#d5daea',
}

const XANH = '#0a8a3e'
const DO = '#d21f30'

/** Vẽ các nét chấm lên canvas (dy = lệch xuống do header). NetCham sinh bởi dsCham. */
function veChua(c: CanvasRenderingContext2D, nets: ReturnType<typeof dsCham>, dy: number) {
  for (const n of nets) {
    if (n.k === 'cham') {
      c.beginPath()
      c.arc(n.x, n.y + dy, n.r * 0.62, 0, Math.PI * 2)
      c.fillStyle = n.dung ? XANH : DO
      c.globalAlpha = 0.85
      c.fill()
      c.globalAlpha = 1
    } else if (n.k === 'vong') {
      c.beginPath()
      c.arc(n.x, n.y + dy, n.r * 0.75, 0, Math.PI * 2)
      c.strokeStyle = XANH
      c.lineWidth = Math.max(2, n.r * 0.28)
      c.stroke()
    } else {
      c.fillStyle = DO
      c.font = `800 ${Math.max(11, n.r * 2.2)}px sans-serif`
      c.textBaseline = 'middle'
      c.textAlign = n.neo === 'giua' ? 'center' : n.neo === 'phai' ? 'right' : 'left'
      c.fillText(n.txt, n.x, n.y + dy)
      c.textAlign = 'left'
    }
  }
}

/** Phiếu đã chấm → PNG: dòng đầu là tên/SBD/mã/điểm, dưới là ảnh phiếu có nét bút chữa */
export async function anhPhieuCham(
  anh: Blob, kq: KqCham, trang: [number, number], dongTieu: string[],
  chua?: { doc: DocCham; da: DapAn; diem: KqDiem; khuon: Khuon },
): Promise<Blob> {
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
  if (chua) veChua(c, dsCham(kq.o, chua.khuon, chua.doc, chua.da, chua.diem), caoDau)
  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('Không vẽ được ảnh'))), 'image/png'))
}
