import type { DocCham, CanXem, OCham, KqCham } from '../types'
import type { KqOmr, ODoc } from './omr'

const TRANG_THAI: Record<string, OCham['trangThai']> = {
  to: 'xam', nghi: 'mo', tay: 'tay', trong: 'trong',
}

const oCham = (phan: OCham['phan'], o: ODoc, q?: number, i?: number): OCham => ({
  phan, q, i, x: o.x, y: o.y, r: o.r, to: o.tt === 'to', trangThai: TRANG_THAI[o.tt] ?? 'mo',
})

/** KqOmr thô → KqCham {doc, can, o, xoay180} (chưa chấm điểm) */
export function omrKqToKq(kq: KqOmr): { doc: DocCham; can: CanXem[]; o: OCham[]; xoay180: boolean } {
  const can: CanXem[] = []
  const os: OCham[] = []

  if (kq.sbd) {
    kq.sbd.o.forEach((col, i) => col.forEach((o, j) => os.push(oCham('sbd', o, j, i))))
    if (kq.sbd.nghi || kq.sbd.s.includes('?')) can.push({ loai: 'sbd', phan: 'sbd' })
  }
  if (kq.ma) {
    kq.ma.o.forEach((col, i) => col.forEach((o, j) => os.push(oCham('ma', o, j, i))))
    if (kq.ma.nghi || kq.ma.s.includes('?')) can.push({ loai: 'ma', phan: 'ma' })
  }
  kq.khac?.forEach((kk, ci) =>
    kk.o.forEach((col, i) => col.forEach((o, j) => os.push(oCham('khac', o, j, i + ci * 100)))))

  kq.p1.forEach((c, i) => {
    c.o.forEach((o, j) => os.push(oCham('p1', o, i + 1, j)))
    if (c.nghi) can.push({ loai: 'mo', phan: 'p1', q: i + 1 })
  })
  kq.p2.forEach((c, i) => {
    c.o.forEach((pair, y) => pair.forEach((o, ds) => os.push(oCham('p2', o, i + 1, y * 2 + ds))))
    c.nghi.forEach((n, y) => { if (n) can.push({ loai: 'mo', phan: 'p2', q: i + 1, i: y }) })
  })
  kq.p3.forEach((c, i) => {
    c.o.forEach((col, ci) => {
      col.so.forEach((o, j) => os.push(oCham('p3', o, i + 1, ci * 12 + j)))
      if (col.tru) os.push(oCham('p3', col.tru, i + 1, ci * 12 + 10))
      if (col.phay) os.push(oCham('p3', col.phay, i + 1, ci * 12 + 11))
    })
    if (c.nghi) can.push({ loai: 'mo', phan: 'p3', q: i + 1 })
  })

  const doc: DocCham = {
    sbd: kq.sbd?.s ?? '',
    ma: kq.ma?.s ?? '',
    maNguon: 'to',
    sbdNguon: 'to',
    p1: kq.p1.map(c => c.chon),
    p2: kq.p2.map(c => c.y),
    p3: kq.p3.map(c => c.s),
    ...(kq.khac?.length ? { khac: kq.khac.map(k => ({ ten: k.ten, s: k.s })) } : {}),
  }
  // tọa độ ô từ pixel ảnh gốc → không gian khuôn (khớp ảnh nắn + viewBox)
  for (const oo of os) {
    const [x, y] = kq.nguoc(oo.x, oo.y)
    oo.x = x; oo.y = y
  }
  return { doc, can, o: os, xoay180: kq.chatLuong.xoay180 }
}
