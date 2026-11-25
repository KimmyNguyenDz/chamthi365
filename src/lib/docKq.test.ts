import { describe, it, expect } from 'vitest'
import { omrKqToKq } from './docKq'
import type { KqOmr } from './omr'

const o = (tt: string): { x: number; y: number; r: number; dam: number; sang: number; vien: number; tt: string } =>
  ({ x: 10, y: 20, r: 4, dam: tt === 'to' ? .8 : 0, sang: 250, vien: .5, tt })

const kqGia = (over: Partial<KqOmr> = {}): KqOmr => ({
  sbd: { s: '37', nghi: false, o: [[o('trong'), o('trong')], [o('trong'), o('to')]] },
  ma: { s: '2', nghi: false, o: [[o('trong')]] },
  p1: [
    { q: 1, chon: 'A', nghi: false, o: [o('to'), o('trong'), o('trong'), o('trong')] },
    { q: 2, chon: '', nghi: true, o: [o('nghi'), o('trong'), o('trong'), o('trong')] },
  ],
  p2: [{ q: 1, y: ['Đ', ''], nghi: [false, true], o: [[o('to'), o('trong')], [o('nghi'), o('trong')]] }],
  p3: [{ q: 1, s: '25', hopLe: true, nghi: false, o: [{ so: [o('trong')] }] }],
  khac: [{ ten: 'Lớp', s: '1', nghi: false, o: [[o('trong')]] }],
  nghi: ['Câu 2'],
  chatLuong: { doNet: .5, khopMoc: 6, tongMoc: 6, xoay180: false, nguong: .3, damTo: .7 },
  chieu: (x, y) => [x, y],
  nguoc: (x, y) => [x, y],
  ...over,
})

describe('omrKqToKq', () => {
  it('map DocCham đầy đủ', () => {
    const { doc, can, o: os, xoay180 } = omrKqToKq(kqGia())
    expect(doc).toEqual({
      sbd: '37', ma: '2', maNguon: 'to', sbdNguon: 'to',
      p1: ['A', ''], p2: [['Đ', '']], p3: ['25'],
      khac: [{ ten: 'Lớp', s: '1' }],
    })
    expect(can).toContainEqual({ loai: 'mo', phan: 'p1', q: 2 })
    expect(can).toContainEqual({ loai: 'mo', phan: 'p2', q: 1, i: 1 })
    expect(xoay180).toBe(false)
    expect(os.length).toBeGreaterThan(0)
    expect(os.find(x => x.phan === 'p1' && x.q === 1 && x.i === 0)).toMatchObject({ to: true, trangThai: 'xam' })
  })

  it('sbd/ma nghi → can sbd + ma', () => {
    const k = kqGia()
    k.sbd = { ...k.sbd!, s: '3?', nghi: true }
    k.ma = { ...k.ma!, nghi: true }
    const { can, doc } = omrKqToKq(k)
    expect(doc.sbd).toBe('3?')
    expect(can).toContainEqual({ loai: 'sbd', phan: 'sbd' })
    expect(can).toContainEqual({ loai: 'ma', phan: 'ma' })
  })

  it('xoay180 + p3 không hợp lệ → can', () => {
    const k = kqGia()
    k.chatLuong.xoay180 = true
    k.p3[0].hopLe = false; k.p3[0].nghi = true
    const { can, xoay180 } = omrKqToKq(k)
    expect(xoay180).toBe(true)
    expect(can).toContainEqual({ loai: 'mo', phan: 'p3', q: 1 })
  })

  it('không có sbd/khac → bỏ qua', () => {
    const k = kqGia()
    k.sbd = null; k.khac = undefined
    const { doc } = omrKqToKq(k)
    expect(doc.sbd).toBe('')
    expect(doc.khac).toBeUndefined()
  })
})
