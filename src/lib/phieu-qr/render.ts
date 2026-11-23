// Sinh khuôn phiếu QR Chamthi365 — schema Khuon giống thư viện gốc,
// vùng mã đề thay bằng QR (doc maNguon='qr'), SBD vẫn tô ô (trừ khi QR có sbd)
import type { Khuon, MauPhieu } from '../../types'

export type OptKhuonQR = { p1: number; p2: number; p3: number; soSbd: number; soMa?: number; tuLuan?: boolean }

const R = 8 // bán kính ô (đơn vị khuôn ~ 1000x1414)

/** Layout A4 dọc 1000×1414: 4 mốc góc, hàng SBD, khối QR trái + đáp án phải */
export function renderKhuonQR(o: OptKhuonQR): Khuon {
  const W = 1000, H = 1414
  const m = 40 // lề
  const k: Khuon = {
    trang: [W, H], r: R,
    goc: [[m, m], [W - m, m], [W - m, H - m], [m, H - m]],
    moc: [[m, m, 14], [W - m, m, 14], [W - m, H - m, 14], [m, H - m, 14]],
    sbd: [], ma: [], khac: [], p1: [], p2: [], p3: [],
    nhan: { p1: 100, p2: 220, p3: 320 },
    rk: { o: R },
    qr: { x: m + 20, y: 200, canh: 180 },
  }
  // lưới SBD: cột = 1 chữ số, 10 hàng 0-9
  if (o.soSbd > 0) {
    const x0 = m + 60, dx = 44, y0 = 420, dy = 30
    for (let c = 0; c < o.soSbd; c++) {
      const col: [number, number][] = []
      for (let d = 0; d < 10; d++) col.push([x0 + c * dx, y0 + d * dy])
      k.sbd.push(col)
    }
  }
  // lưới mã đề vẫn sinh (fallback khi QR không đọc được — phiếu in có thể vẫn có lưới mã)
  if (o.soMa) {
    const x0 = m + 60, dx = 44, y0 = 60, dy = 30
    for (let c = 0; c < o.soMa; c++) {
      const col: [number, number][] = []
      for (let d = 0; d < 10; d++) col.push([x0 + c * dx, y0 + d * dy])
      k.ma.push(col)
    }
  }
  // P1: 4 ô/câu, 2 cột
  const paX = m + 340, paY0 = 200, dx = 34, dy = 30, moiCot = Math.ceil(o.p1 / 2)
  for (let q = 0; q < o.p1; q++) {
    const cot = Math.floor(q / moiCot), r = q % moiCot
    const y = paY0 + r * dy, x = paX + cot * 300
    k.p1.push({ q, o: [[x, y], [x + dx, y], [x + 2 * dx, y], [x + 3 * dx, y]] })
  }
  // P2: mỗi câu 4 ý, mỗi ý 2 ô Đ/S
  const p2Y0 = paY0 + moiCot * dy + 60
  const moiCot2 = Math.ceil(o.p2 / 2)
  for (let q = 0; q < o.p2; q++) {
    const cot = Math.floor(q / moiCot2), r = q % moiCot2
    const y = p2Y0 + r * dy, x = paX + cot * 420
    k.p2.push({ q, y: [[[x, y], [x + dx, y]], [[x + 70, y], [x + 70 + dx, y]], [[x + 140, y], [x + 140 + dx, y]], [[x + 210, y], [x + 210 + dx, y]]] })
  }
  // P3: mỗi câu 4 ký tự; mỗi ký tự 1 cột ô dọc 0-9 + trừ + phẩy (12 ô)
  const p3Y0 = p2Y0 + moiCot2 * dy + 60
  const moiCot3 = Math.ceil(o.p3 / 2)
  const dy3 = 14, dx3 = 30
  for (let q = 0; q < o.p3; q++) {
    const cot = Math.floor(q / moiCot3), r = q % moiCot3
    const y = p3Y0 + r * 190, x = paX + cot * 300
    const cs = []
    for (let c = 0; c < 4; c++) {
      const so: [number, number][] = []
      for (let d = 0; d < 10; d++) so.push([x + c * dx3, y + d * dy3])
      cs.push({ so, tru: [x + c * dx3, y + 10 * dy3] as [number, number], phay: [x + c * dx3, y + 11 * dy3] as [number, number] })
    }
    k.p3.push({ q, c: cs })
  }
  return k
}

/** Khuôn QR mặc định theo bộ câu phổ biến (thêm vào mucluc runtime) */
export const MAU_QR: { ma: string; ten: string; soCau: OptKhuonQR }[] = [
  { ma: 'ct365-qr-12-04-06', ten: 'Chamthi365 QR · 12-4-6 (Toán 2025)', soCau: { p1: 12, p2: 4, p3: 6, soSbd: 8 } },
  { ma: 'ct365-qr-40-08-06', ten: 'Chamthi365 QR · 40-8-6', soCau: { p1: 40, p2: 8, p3: 6, soSbd: 8 } },
  { ma: 'ct365-qr-40-0-0', ten: 'Chamthi365 QR · 40 câu P.I', soCau: { p1: 40, p2: 0, p3: 0, soSbd: 8 } },
  { ma: 'ct365-qr-50-0-0', ten: 'Chamthi365 QR · 50 câu P.I', soCau: { p1: 50, p2: 0, p3: 0, soSbd: 8 } },
]

const _khuonQR = new Map<string, Khuon>()

/** MauPhieu runtime cho các mẫu QR (nối vào mucLuc) */
export function dsMauQR(): MauPhieu[] {
  return MAU_QR.map(m => ({
    ma: m.ma, ten: m.ten, ho: 'Chamthi365 QR',
    khuon: [{ trang: 1, clip: null, khuon: m.ma }],
    phach: false, so_sbd: m.soCau.soSbd, so_ma: m.soCau.soMa ?? 4, stt: false,
    o_diem: false, mau: true, tu_luan: !!m.soCau.tuLuan, so_trang: 1,
    p1: m.soCau.p1, p2: m.soCau.p2, p3: m.soCau.p3, da_va: 0, tu: 'ct365', qr: true,
  }))
}

/** Khuôn QR theo id (cache) — trả null nếu id không phải mẫu QR */
export function khuonQR(id: string): Khuon | null {
  const m = MAU_QR.find(x => x.ma === id)
  if (!m) return null
  let k = _khuonQR.get(id)
  if (!k) { k = renderKhuonQR(m.soCau); _khuonQR.set(id, k) }
  return k
}
