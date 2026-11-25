// Xuất ảnh phiếu đã chấm ra PNG: header điểm + ảnh nắn + nét bút chữa đúng/sai
import type { DapAn, DocCham, KqCham, OCham } from '../types'
import type { KqDiem } from './diem'

export const MAU_CHAM: Record<OCham['trangThai'], string> = {
  dung: '#2fae60', sai: '#e2444f', mo: '#f08a1d', xam: '#9aa0bd',
  tay: '#3a8ef0', trung: '#e6b800', trong: '#d5daea',
}

const XANH = '#0a8a3e'
const DO = '#d21f30'

/** nét tick V (bút xanh) */
function tickV(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.strokeStyle = XANH
  c.lineWidth = Math.max(2.5, r * 0.34)
  c.lineCap = 'round'
  c.lineJoin = 'round'
  c.beginPath()
  c.moveTo(x - r * 0.72, y + r * 0.05)
  c.lineTo(x - r * 0.18, y + r * 0.6)
  c.lineTo(x + r * 0.8, y - r * 0.62)
  c.stroke()
}

/** nét gạch X (bút đỏ) */
function tickX(c: CanvasRenderingContext2D, x: number, y: number, r: number) {
  c.strokeStyle = DO
  c.lineWidth = Math.max(2.5, r * 0.3)
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(x - r * 0.6, y - r * 0.6)
  c.lineTo(x + r * 0.6, y + r * 0.6)
  c.moveTo(x + r * 0.6, y - r * 0.6)
  c.lineTo(x - r * 0.6, y + r * 0.6)
  c.stroke()
}

/** Viết đáp án đúng cạnh câu hỏi (bút đỏ) — ví dụ "→ 1,02" */
function vietDapAn(c: CanvasRenderingContext2D, x: number, y: number, r: number, txt: string) {
  c.fillStyle = DO
  c.font = `800 ${Math.max(11, r * 2.2)}px sans-serif`
  c.textBaseline = 'middle'
  c.fillText(`→ ${txt}`, x, y)
}

/** Chữa trên phiếu: ✓xanh ô đúng, ✗đỏ ô sai + ✓xanh đáp án đúng; P.III sai ghi đáp số */
function veChua(c: CanvasRenderingContext2D, os: OCham[], dy: number, chua: { doc: DocCham; da: DapAn; diem: KqDiem }) {
  const { doc, da, diem } = chua
  const oTai = (phan: OCham['phan'], q: number, i: number) => os.find(x => x.phan === phan && x.q === q && x.i === i)
  const R = (o?: OCham) => (o?.r ?? 8) * 1.7

  // Phần I: đúng → ✓ ô đã tô; sai → ✗ ô đã tô + ✓ ô đáp án đúng
  doc.p1.forEach((g, v) => {
    const dung = diem.p1[v]?.dung
    if (dung == null) return
    const osQ = os.filter(x => x.phan === 'p1' && x.q === v + 1)
    for (const o of osQ.filter(x => x.to)) (dung ? tickV : tickX)(c, o.x, o.y + dy, R(o))
    if (!dung) for (const ch of da.p1[v] ?? '') {
      if (ch === '*') continue
      const o = oTai('p1', v + 1, 'ABCD'.indexOf(ch))
      if (o) tickV(c, o.x, o.y + dy, R(o))
    }
  })

  // Phần II: từng ý — đúng → ✓ ô Đ/S đã tô; sai → ✗ ô đã tô + ✓ ô đúng
  doc.p2.forEach((g, v) => {
    for (let y = 0; y < 4; y++) {
      const dung = diem.p2[v]?.y[y]
      if (dung == null) continue
      const chon = g[y]
      const dungDa = da.p2[v]?.[y]
      const iTo = chon === 'Đ' ? y * 2 : chon === 'S' ? y * 2 + 1 : -1
      if (iTo >= 0) {
        const o = oTai('p2', v + 1, iTo)
        if (o) (dung ? tickV : tickX)(c, o.x, o.y + dy, R(o))
      }
      if (!dung && (dungDa === 'Đ' || dungDa === 'S')) {
        const o = oTai('p2', v + 1, y * 2 + (dungDa === 'Đ' ? 0 : 1))
        if (o) tickV(c, o.x, o.y + dy, R(o))
      }
    }
  })

  // Phần III: đúng → ✓ các ô số đã tô; sai → ghi đáp số cạnh câu
  doc.p3.forEach((g, v) => {
    const dung = diem.p3[v]?.dung
    if (dung == null) return
    const osQ = os.filter(x => x.phan === 'p3' && x.q === v + 1)
    if (dung) {
      for (const o of osQ.filter(x => x.to)) tickV(c, o.x, o.y + dy, R(o))
    } else {
      const daSo = da.p3[v]
      if (!daSo || daSo === '*') return
      const top = Math.min(...osQ.map(x => x.y), Infinity)
      const trai = Math.min(...osQ.map(x => x.x), Infinity)
      if (isFinite(top)) vietDapAn(c, trai - R(osQ[0]) * 0.8, top - R(osQ[0]) * 3.2, R(osQ[0]), daSo)
    }
  })
}

/** Phiếu đã chấm → PNG: dòng đầu là tên/SBD/mã/điểm, dưới là ảnh phiếu có nét bút chữa */
export async function anhPhieuCham(
  anh: Blob, kq: KqCham, trang: [number, number], dongTieu: string[],
  chua?: { doc: DocCham; da: DapAn; diem: KqDiem },
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
  if (chua) {
    veChua(c, kq.o, caoDau, chua)
  } else {
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
  }
  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('Không vẽ được ảnh'))), 'image/png'))
}
