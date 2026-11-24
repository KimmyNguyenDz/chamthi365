// Khuôn cv1239a1 (phiếu CV1239 bản Letter 1 trang) — chấm thử trên render PNG thật.
import { describe, expect, it } from 'vitest'
import { chamAnh } from './omr'
import type { Khuon } from '../types'

const SCALE = 2
async function taiAnh(fill = false) {
  const { default: sharp } = await import('sharp')
  const { readFileSync } = await import('fs')
  const k = JSON.parse(readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8')) as Khuon
  const { data, info } = await sharp('_research/phieu1239-1.png')
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const d = new Uint8ClampedArray(data)
  if (fill) {
    const to = (x: number, y: number) => {
      const cx = Math.round(x * SCALE), cy = Math.round(y * SCALE), R = 7
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > R * R) continue
        const i = ((cy + dy) * info.width + cx + dx) * 4
        d[i] = d[i + 1] = d[i + 2] = 10
      }
    }
    // SBD 10010201: cột i tô số d[i]
    '10010201'.split('').forEach((s, i) => to(k.sbd[i][+s][0], k.sbd[i][+s][1]))
    // mã đề 0101
    '0101'.split('').forEach((s, i) => to(k.ma[i][+s][0], k.ma[i][+s][1]))
    // P1: câu 1-5 tô A B C D A
    'ABCDA'.split('').forEach((c, i) => {
      const j = 'ABCD'.indexOf(c)
      to(k.p1[i].o[j][0], k.p1[i].o[j][1])
    })
    // P2: câu 1 tô Đúng cả 4 ý (cột 0 = Đ)
    for (const r of k.p2[0].y) to(r[0][0], r[0][1])
    // P3 câu 1 = "0,5": cột0 số 0, cột1 phay, cột2 số 5
    to(k.p3[0].c[0].so[0][0], k.p3[0].c[0].so[0][1])
    to(k.p3[0].c[1].phay![0], k.p3[0].c[1].phay![1])
    to(k.p3[0].c[2].so[5][0], k.p3[0].c[2].so[5][1])
  }
  return { anh: { w: info.width, h: info.height, d }, k }
}

describe('khuôn cv1239a1 — phiếu CV1239 Letter', () => {
  it('phiếu trắng: khớp mốc, cấu trúc hợp lệ', async () => {
    const { anh, k } = await taiAnh(false)
    const kq = chamAnh(anh, k)
    console.log('trang:', 'khopMoc', kq.chatLuong.khopMoc, '/', kq.chatLuong.tongMoc,
      'sbd=', kq.sbd?.s, 'ma=', kq.ma?.s)
    expect(kq.chatLuong.khopMoc).toBeGreaterThanOrEqual(10)
    for (const c of kq.p1) expect(c.chon).toMatch(/^[A-D]{0,4}$/)
  }, 60000)

  it('phiếu tô SBD 10010201, mã đề 0101, P1 ABCDA, P2 câu1 Đ, P3 câu1 "0,5"', async () => {
    const { anh, k } = await taiAnh(true)
    const kq = chamAnh(anh, k)
    console.log('to:', 'sbd=', kq.sbd?.s, 'ma=', kq.ma?.s,
      'p1=', kq.p1.slice(0, 5).map(c => c.chon).join(''),
      'p2c1=', kq.p2[0].y.join('|'),
      'p3c1=', kq.p3[0].s)
    expect(kq.sbd?.s).toBe('10010201')
    expect(kq.ma?.s).toBe('0101')
    expect(kq.p1.slice(0, 5).map(c => c.chon).join('')).toBe('ABCDA')
    expect(kq.p2[0].y).toEqual(['Đ', 'Đ', 'Đ', 'Đ'])
    expect(kq.p3[0].s).toBe('0,5')
  }, 60000)
})
