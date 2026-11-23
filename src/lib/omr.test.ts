import { describe, it, expect } from 'vitest'
import { chamAnh, LoiCham } from './omr'
import type { Khuon } from '../types'

/** Khuôn tổng hợp nhỏ: trang 300x400pt, 4 mốc góc lớn + 2 mốc cạnh, SBD 2 cột, mã đề 1 cột 4 ô, P1 4 câu, P2 1 câu 4 ý, P3 1 câu 2 cột số */
export function khuonTest(): Khuon {
  const goc: [number, number][] = [[20, 20], [280, 20], [280, 380], [20, 380]]
  const moc: [number, number, number][] = [
    ...goc.map(([x, y]): [number, number, number] => [x, y, 12]),
    [150, 20, 6], [150, 380, 6],
  ]
  const sbd: [number, number][][] = [0, 1].map(c =>
    Array.from({ length: 10 }, (_, i): [number, number] => [50 + c * 20, 60 + i * 12]))
  const ma: [number, number][][] = [
    Array.from({ length: 4 }, (_, i): [number, number] => [110, 60 + i * 12]),
  ]
  const p1 = Array.from({ length: 4 }, (_, q) => ({
    q: q + 1,
    o: Array.from({ length: 4 }, (_, j): [number, number] => [160 + j * 15, 60 + q * 15]),
  }))
  const p2 = [{
    q: 1,
    y: Array.from({ length: 4 }, (_, y): [[number, number], [number, number]] => [
      [160, 150 + y * 15], [175, 150 + y * 15],
    ]),
  }]
  const p3 = [{
    q: 1,
    c: [0, 1].map(c => ({
      so: Array.from({ length: 10 }, (_, i): [number, number] => [230 + c * 20, 150 + i * 12]),
      tru: c === 0 ? undefined : undefined,
      phay: undefined,
    })),
  }]
  return {
    trang: [300, 400], r: 4, goc, moc, sbd, ma,
    khac: [], p1, p2, p3,
    nhan: [], nhan_khop: [], thieu: [], la: [], tong_o: 0,
    rk: {}, nguon: '', o_bi_che: [], clip: null, id: 'test',
  } as unknown as Khuon
}

type AnhRgba = { w: number; h: number; d: Uint8ClampedArray }

/** Render phiếu: nền trắng, mốc = ô vuông đặc, ô tô = vòng tròn viền (tô = đặc) */
export function render(k: Khuon, scale: number, to: Set<string>, rot = 0): AnhRgba {
  const w = Math.round(k.trang[0] * scale), h = Math.round(k.trang[1] * scale)
  const d = new Uint8ClampedArray(w * h * 4).fill(255)
  const px = (x: number, y: number, den: boolean) => {
    const xi = Math.round(x), yi = Math.round(y)
    if (xi < 0 || yi < 0 || xi >= w || yi >= h) return
    const o = (yi * w + xi) * 4
    const v = den ? 0 : 255
    d[o] = d[o + 1] = d[o + 2] = v; d[o + 3] = 255
  }
  const [cx, cy] = [k.trang[0] / 2, k.trang[1] / 2]
  const cos = Math.cos(rot), sin = Math.sin(rot)
  // pixel → tọa độ khuôn (biến đổi ngược): phủ sóng chắc chắn, không bỏ sót pixel
  const nguoc = (px_: number, py_: number): [number, number] => {
    const dx = (px_ - w / 2) / scale, dy = (py_ - h / 2) / scale
    return [cx + dx * cos + dy * sin, cy - dx * sin + dy * cos]
  }
  const toVung = (x: number, y: number, r: number, test: (tx: number, ty: number) => boolean) => {
    const R = (r + 2) * scale
    const cxp = w / 2 + (x - cx) * scale * cos - (y - cy) * scale * sin
    const cyp = h / 2 + (x - cx) * scale * sin + (y - cy) * scale * cos
    for (let py_ = Math.max(0, Math.floor(cyp - R)); py_ <= Math.min(h - 1, Math.ceil(cyp + R)); py_++)
      for (let px_ = Math.max(0, Math.floor(cxp - R)); px_ <= Math.min(w - 1, Math.ceil(cxp + R)); px_++) {
        const [tx, ty] = nguoc(px_ + .5, py_ + .5)
        if (test(tx, ty)) px(px_ + .5, py_ + .5, true)
      }
  }
  for (const [x, y, s] of k.moc)
    toVung(x, y, s * .8, (tx, ty) => Math.abs(tx - x) <= s / 2 && Math.abs(ty - y) <= s / 2)
  const oTron = (x: number, y: number, khoa: string, r = k.r) => {
    const dac = to.has(khoa)
    toVung(x, y, r * 1.6, (tx, ty) => {
      const dist = Math.hypot(tx - x, ty - y)
      return dac ? dist <= r : Math.abs(dist - r) <= .6
    })
  }
  k.sbd.forEach((c, i) => c.forEach(([x, y], j) => oTron(x, y, `sbd:${i}:${j}`)))
  k.ma.forEach((c, i) => c.forEach(([x, y], j) => oTron(x, y, `ma:${i}:${j}`)))
  k.p1.forEach((c, q) => c.o.forEach(([x, y], j) => oTron(x, y, `p1:${q}:${j}`)))
  k.p2.forEach((c, q) => c.y.forEach(([dd, ss], y) => {
    oTron(dd[0], dd[1], `p2:${q}:${y}:0`)
    oTron(ss[0], ss[1], `p2:${q}:${y}:1`)
  }))
  k.p3.forEach((c, q) => c.c.forEach((col, ci) =>
    col.so.forEach(([x, y], j) => oTron(x, y, `p3:${q}:${ci}:${j}`))))
  return { w, h, d }
}

const k = khuonTest()

describe('chamAnh — OMR core', () => {
  it('đọc phiếu render chuẩn: SBD, mã đề, P1/P2/P3', () => {
    const to = new Set([
      'sbd:0:3', 'sbd:1:7',     // SBD 37
      'ma:0:2',                 // mã đề 2
      'p1:0:0', 'p1:1:2', 'p1:2:1', 'p1:3:3', // A C B D
      'p2:0:0:0', 'p2:0:1:1', 'p2:0:2:0', 'p2:0:3:1', // Đ S Đ S
      'p3:0:0:2', 'p3:0:1:5',   // đáp số 25
    ])
    const kq = chamAnh(render(k, 3, to), k)
    expect(kq.sbd!.s).toBe('37')
    expect(kq.ma!.s).toBe('2')
    expect(kq.p1.map(c => c.chon)).toEqual(['A', 'C', 'B', 'D'])
    expect(kq.p2[0].y).toEqual(['Đ', 'S', 'Đ', 'S'])
    expect(kq.p3[0].s).toBe('25')
    expect(kq.p3[0].hopLe).toBe(true)
    expect(kq.nghi.length).toBe(0)
    expect(kq.chatLuong.khopMoc).toBe(k.moc.length)
  })

  it('chịu được xoay nhẹ + nghiêng', () => {
    const to = new Set(['sbd:0:0', 'sbd:1:1', 'ma:0:3', 'p1:0:3', 'p2:0:0:0', 'p3:0:0:4'])
    const kq = chamAnh(render(k, 3, to, .03), k)
    expect(kq.sbd!.s).toBe('01')
    expect(kq.ma!.s).toBe('3')
    expect(kq.p1[0].chon).toBe('D')
    expect(kq.p2[0].y[0]).toBe('Đ')
    expect(kq.p3[0].s).toBe('4')
  })

  it('phiếu trắng tinh → lỗi thieu_moc', () => {
    const trang = { w: 300, h: 400, d: new Uint8ClampedArray(300 * 400 * 4).fill(255) }
    expect(() => chamAnh(trang, k)).toThrow(LoiCham)
    try { chamAnh(trang, k) } catch (e) {
      expect((e as LoiCham).ma).toBe('thieu_moc')
      expect((e as LoiCham).message).toContain('góc')
    }
  })

  it('ô tô 2 đáp án → P1 đọc cả hai chữ', () => {
    const to = new Set(['p1:0:0', 'p1:0:2', 'ma:0:0'])
    const kq = chamAnh(render(k, 3, to), k)
    expect(kq.p1[0].chon).toBe('AC')
  })

  it('trả chieu() ánh xạ tọa độ khuôn → px ảnh gốc', () => {
    const kq = chamAnh(render(k, 3, new Set()), k)
    const [x, y] = kq.chieu(20, 20)
    expect(x).toBeGreaterThan(40)
    expect(x).toBeLessThan(80)
    expect(y).toBeGreaterThan(40)
    expect(y).toBeLessThan(80)
  })
})

describe('chamAnh — ảnh quét thật từ bài mẫu gốc', async () => {
  const { default: sharp } = await import('sharp')
  const { readFileSync } = await import('fs')
  const khuonThat = JSON.parse(readFileSync('public/thu-vien/khuon/52d461e4.json', 'utf8')) as Khuon

  it.each([1, 2, 3, 4])('phieu-%d.webp đọc được cấu trúc hợp lệ', async (n) => {
    const { data, info } = await sharp(`public/mau/phieu-${n}.webp`)
      .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const kq = chamAnh({ w: info.width, h: info.height, d: new Uint8ClampedArray(data) }, khuonThat)
    console.log(`phieu-${n}: sbd="${kq.sbd?.s}" ma="${kq.ma?.s}" khopMoc=${kq.chatLuong.khopMoc}/${kq.chatLuong.tongMoc}`,
      'p1=', kq.p1.map(c => c.chon || '·').join(''),
      'p3=', kq.p3.map(c => c.s || '·').join('|'), 'nghi:', kq.nghi.length)
    expect(kq.chatLuong.khopMoc).toBeGreaterThanOrEqual(4)
    expect(kq.sbd?.s).toMatch(/^[\d?]+$/)
    expect(kq.ma?.s).toMatch(/^[\d?]+$/)
    for (const c of kq.p1) expect(c.chon).toMatch(/^[A-D]{0,4}$/)
    for (const c of kq.p2) for (const y of c.y) expect(y).toMatch(/^(Đ|S|ĐS|)$/)
    for (const c of kq.p3) expect(c.s).toMatch(/^-?\d*(,\d*)?$|^\?+$|^$/)
  }, 60000)
})
