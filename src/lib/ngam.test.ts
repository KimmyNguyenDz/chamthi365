import { describe, it, expect } from 'vitest'
import { ngam, toanBoO } from './ngam'
import { nhanDang, type DbNhanDang, type KhuonNhan } from './nhanDang'
import { khuonTest, render } from './omr.test'
import type { Khuon } from '../types'

const k = khuonTest()

describe('ngam — phát hiện phiếu realtime', () => {
  it('phát hiện tứ giác + mốc + vân trên phiếu render', () => {
    const a = render(k, 3, new Set(['p1:0:1']))
    const kq = ngam(k, toanBoO(k), 'f1', a.w, a.h, a.d)
    expect(kq.goc).not.toBeNull()
    expect(kq.khop).toBe(k.moc.length)
    // tứ giác trang ≈ [0,0],[300,0],[300,400],[0,400] × scale 3
    const [tl] = kq.goc!
    expect(tl[0]).toBeLessThan(40)
    expect(tl[1]).toBeLessThan(40)
    expect(kq.moc.length).toBe(k.moc.length)
    expect(kq.moc.every(m => m.ok)).toBe(true)
    expect(kq.van).not.toBeNull()
    expect(kq.van!.length).toBe(toanBoO(k).length)
    expect(kq.vanTrang).not.toBeNull()
    expect(kq.net).toBeGreaterThan(0)
  })

  it('khung không có phiếu → goc null', () => {
    const trang = new Uint8ClampedArray(300 * 400 * 4).fill(255)
    const kq = ngam(k, toanBoO(k), 'f2', 300, 400, trang)
    expect(kq.goc).toBeNull()
    expect(kq.van).toBeNull()
  })
})

describe('nhanDang — nhận loại phiếu', () => {
  // fingerprint giả lập: render lưới đốm + vòng ô của khuôn về w×h
  const vanGia = (k2: KhuonNhan, w: number, h: number): Uint8Array => {
    const o = k2.goc.map(x => x[0]), a = k2.goc.map(x => x[1])
    const c = Math.min(...o), e = Math.min(...a)
    const i = Math.max(...o) - c, l = Math.max(...a) - e
    const v = new Uint8Array(w * h)
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let den = 0
        for (const dy of [.25, .5, .75])
          for (const dx of [.25, .5, .75]) {
            const tx = c + (x + dx) / w * i, ty = e + (y + dy) / h * l
            let toi = 0
            for (const [mx, my, ms] of k2.moc)
              if (Math.abs(tx - mx) <= ms / 2 && Math.abs(ty - my) <= ms / 2) toi = 1
            for (const [bx, by] of k2.o)
              if (Math.abs(Math.hypot(tx - bx, ty - by) - k2.r) <= .7) toi = 1
            den += toi
          }
        v[y * w + x] = 255 - den / 9 * 255
      }
    return v
  }

  const kn = (kk: Khuon): KhuonNhan => ({
    trang: kk.trang, goc: kk.goc, moc: kk.moc, r: kk.r,
    rk: kk.rk, o: toanBoO(kk),
  })

  it('nhận đúng khuôn trong DB giả', () => {
    const W = 16, H = 22
    // khuôn giả thứ 2: lưới ô khác hẳn (fingerprint khác)
    const k2 = { ...kn(k), moc: k.moc.map(([x, y, s]): [number, number, number] => [x + 4, y + 4, s]) }
    const v1 = vanGia(kn(k), W, H), v2 = vanGia(k2, W, H)
    const db: DbNhanDang = {
      dai: H,
      nhom: [{ k: kn(k), ks: ['k-dung', 'k-sai'] }],
      mau: { 'k-dung': [0, W, H], 'k-sai': [W * H, W, H] },
      bin: new Uint8Array([...v1, ...v2]),
    }
    const a = render(k, 3, new Set(['sbd:0:2']))
    const kq = nhanDang({ w: a.w, h: a.h, d: a.d }, db)
    expect(kq.goiY.length).toBeGreaterThan(0)
    expect(kq.goiY[0].khuon).toBe('k-dung')
    expect(kq.goiY[0].diem).toBeGreaterThan(kq.goiY[1]?.diem ?? -1)
    expect(kq.goiY[0].diem).toBeGreaterThan(.5)
    expect(kq.soKieu).toBeGreaterThan(0)
  })
})
