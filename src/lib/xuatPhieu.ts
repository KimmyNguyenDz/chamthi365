// Xuất ảnh phiếu đã chấm ra PNG: header điểm + ảnh nắn + nét bút chữa đúng/sai
import type { DapAn, DocCham, Khuon, KqCham, OCham } from '../types'
import type { KqDiem } from './diem'
import { dsChiTiet, type MucChiTiet } from './chiTiet'

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

/** Chữa trên phiếu: ✓xanh ô đúng, ✗đỏ ô sai + ✓xanh đáp án đúng; P.III sai ghi đáp số.
 *  Vị trí lấy theo khuôn (P.I/II) + ô đã lưu (P.III) — đúng cả phiếu chấm trước khi sửa toạ độ. */
function veChua(c: CanvasRenderingContext2D, os: OCham[], khuon: Khuon, dy: number, chua: { doc: DocCham; da: DapAn; diem: KqDiem }) {
  const { doc, da, diem } = chua
  const r = (khuon.r ?? 3.4) * 1.7
  const [W, H] = khuon.trang
  const trongKhuon = (o: OCham) => o.x > 0 && o.x < W && o.y > 0 && o.y < H
  const kpos = (phan: 'p1' | 'p2' | 'p3', q: number, i: number): [number, number] | null => {
    if (phan === 'p1') return khuon.p1[q - 1]?.o[i] ?? null
    if (phan === 'p2') return khuon.p2[q - 1]?.y[i >> 1]?.[i & 1] ?? null
    const ci = Math.floor(i / 12), j = i % 12, col = khuon.p3[q - 1]?.c[ci]
    return !col ? null : j < 10 ? col.so[j] ?? null : j === 10 ? col.tru ?? null : col.phay ?? null
  }
  const pos = (phan: 'p1' | 'p2' | 'p3', q: number, i: number) => {
    const o = os.find(x => x.phan === phan && x.q === q && x.i === i)
    return o && trongKhuon(o) ? [o.x, o.y] as [number, number] : kpos(phan, q, i)
  }

  // Phần I: đúng → ✓ ô đã tô; sai → ✗ ô đã tô + ✓ ô đáp án đúng
  doc.p1.forEach((g, v) => {
    const dung = diem.p1[v]?.dung
    if (dung == null) return
    for (const ch of g) {
      const p = pos('p1', v + 1, 'ABCDEFGH'.indexOf(ch))
      if (p) (dung ? tickV : tickX)(c, p[0], p[1] + dy, r)
    }
    if (!dung) for (const ch of da.p1[v] ?? '') {
      if (ch === '*') continue
      const p = pos('p1', v + 1, 'ABCDEFGH'.indexOf(ch))
      if (p) tickV(c, p[0], p[1] + dy, r)
    }
  })

  // Phần II: từng ý — đúng → ✓ ô Đ/S đã tô; sai → ✗ ô đã tô + ✓ ô đúng
  doc.p2.forEach((g, v) => {
    for (let y = 0; y < 4; y++) {
      const dung = diem.p2[v]?.y[y]
      if (dung == null) continue
      const chon = g[y]
      if (chon === 'Đ' || chon === 'ĐS') {
        const p = pos('p2', v + 1, y * 2)
        if (p) (dung ? tickV : tickX)(c, p[0], p[1] + dy, r)
      }
      if (chon === 'S' || chon === 'ĐS') {
        const p = pos('p2', v + 1, y * 2 + 1)
        if (p) (dung ? tickV : tickX)(c, p[0], p[1] + dy, r)
      }
      const dungDa = da.p2[v]?.[y]
      if (!dung && (dungDa === 'Đ' || dungDa === 'S')) {
        const p = pos('p2', v + 1, y * 2 + (dungDa === 'Đ' ? 0 : 1))
        if (p) tickV(c, p[0], p[1] + dy, r)
      }
    }
  })

  // Phần III: đúng → ✓ các ô số đã tô; sai → ghi đáp số cạnh câu
  doc.p3.forEach((g, v) => {
    const dung = diem.p3[v]?.dung
    if (dung == null) return
    if (dung) {
      for (const o of os.filter(x => x.phan === 'p3' && x.q === v + 1 && x.to && trongKhuon(x)))
        tickV(c, o.x, o.y + dy, r)
    } else {
      const daSo = da.p3[v]
      const cols = khuon.p3[v]?.c
      if (!daSo || daSo === '*' || !cols?.length) return
      const cuoi = cols[cols.length - 1]
      const yMoc = cols[0].tru?.[1] ?? cols[0].so[0][1]
      vietDapAn(c, cuoi.so[0][0] + r * 1.4, yMoc - r * 3.2, r, daSo)
    }
  })
}

const CHIP_FS = 13, CHIP_PAD = 8, CHIP_GAP = 5, CHIP_H = 22

const CHIP_MAU = (dung: boolean | null): [string, string, string] =>
  dung === true ? ['#e4f6ec', '#1f8a4c', '#a9e2c0']
    : dung === false ? ['#fde8e9', '#c53340', '#f2b4b8']
      : ['#eef0f7', '#6b7394', '#dde1ee']

/** Vẽ bảng chi tiết từng câu (chip xanh/đỏ/xám) — trả về y cuối. Chạy được trên ctx tạm để đo chiều cao. */
function veChiTiet(c: CanvasRenderingContext2D, muc: MucChiTiet[], y0: number, w: number): number {
  let y = y0 + 14
  c.textBaseline = 'middle'
  c.font = '800 15px sans-serif'
  c.fillStyle = '#1b2340'
  c.fillText('Chi tiết từng câu — xanh đúng · đỏ sai (→ đáp án) · xám bỏ trống', 22, y)
  y += 18
  for (const m of muc) {
    c.font = '700 12px sans-serif'
    c.fillStyle = '#5a6280'
    c.fillText(m.tieu, 22, y + 8)
    y += 20
    let x = 22
    c.font = `600 ${CHIP_FS}px sans-serif`
    for (const ch of m.chips) {
      const t = ch.txt + (ch.dung === false && ch.daDung ? ` →${ch.daDung}` : '')
      const cw = c.measureText(t).width + CHIP_PAD * 2
      if (x + cw > w - 22 && x > 22) { x = 22; y += CHIP_H + CHIP_GAP }
      const [bg, fg, bd] = CHIP_MAU(ch.dung)
      const r = 7
      c.beginPath()
      c.roundRect(x, y, cw, CHIP_H, r)
      c.fillStyle = bg
      c.fill()
      c.strokeStyle = bd
      c.lineWidth = 1.2
      c.stroke()
      c.fillStyle = fg
      c.fillText(t, x + CHIP_PAD, y + CHIP_H / 2 + 1)
      x += cw + CHIP_GAP
    }
    y += CHIP_H + 14
  }
  return y
}

/** Phiếu đã chấm → PNG: dòng đầu là tên/SBD/mã/điểm, dưới là ảnh phiếu có nét bút chữa + bảng chi tiết câu */
export async function anhPhieuCham(
  anh: Blob, kq: KqCham, trang: [number, number], dongTieu: string[],
  chua?: { doc: DocCham; da: DapAn; diem: KqDiem; khuon: Khuon },
): Promise<Blob> {
  const [w, h] = trang
  const caoDau = Math.max(64, Math.round(w * 0.085))
  const muc = chua ? dsChiTiet(chua.doc, chua.da, chua.diem) : []
  // đo chiều cao bảng chi tiết trên ctx tạm (resize canvas sẽ xoá nội dung)
  const caoSau = muc.length
    ? veChiTiet(document.createElement('canvas').getContext('2d')!, muc, 0, w) + 16
    : 0
  const bmp = await createImageBitmap(anh)
  const cv = document.createElement('canvas')
  cv.width = w
  cv.height = h + caoDau + caoSau
  const c = cv.getContext('2d')!
  c.fillStyle = '#ffffff'
  c.fillRect(0, 0, w, h + caoDau + caoSau)
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
    veChua(c, kq.o, chua.khuon, caoDau, chua)
    veChiTiet(c, muc, caoDau + h, w)
  }
  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error('Không vẽ được ảnh'))), 'image/png'))
}
