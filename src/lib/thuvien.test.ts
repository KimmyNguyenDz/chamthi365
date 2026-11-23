import { describe, it, expect } from 'vitest'
import { tomTat, nhanCau, locMau, khuonDau } from './thuvien'
import type { MauPhieu } from '../types'

const m = (x: Partial<MauPhieu>): MauPhieu => ({
  ma: 'm', ten: 'A4 · t', ho: 'A4', khuon: [{ trang: 0, clip: null, khuon: 'k0' }],
  phach: false, so_sbd: 6, so_ma: 3, stt: false, o_diem: false, mau: false,
  tu_luan: false, so_trang: 1, p1: 40, p2: 8, p3: 6, da_va: 0, ban_sao: [], tu: 'QM',
  ...x,
})

describe('thuvien', () => {
  it('tomTat mô tả đủ phần/SBD/mã/phách', () => {
    const s = tomTat(m({ phach: true }))
    expect(s).toContain('Phần I 40 câu')
    expect(s).toContain('Phần II 8 câu')
    expect(s).toContain('Phần III 6 câu')
    expect(s).toContain('SBD 6 số')
    expect(s).toContain('mã đề 3 số')
    expect(s).toContain('có phách')
  })

  it('tomTat phiếu chỉ trắc nghiệm và tờ tự luận', () => {
    expect(tomTat(m({ p1: 50, p2: 0, p3: 0, so_sbd: 0 }))).toContain('50 câu trắc nghiệm')
    expect(tomTat(m({ p1: 50, p2: 0, p3: 0, so_sbd: 0 }))).toContain('không tô SBD')
    expect(tomTat(m({ p1: 0, p2: 0, p3: 0, tu_luan: true }))).toContain('Tờ tự luận')
  })

  it('nhanCau "40-08-06" khi có phần II/III, "40 câu" khi chỉ P1', () => {
    expect(nhanCau(m({}))).toBe('40-08-06')
    expect(nhanCau(m({ p2: 0, p3: 0 }))).toBe('40 câu')
  })

  it('locMau lọc theo họ, số câu, phách, từ', () => {
    const ds = [
      m({ ma: 'a', ho: 'Bộ GD 2025 (CV 1239)', p1: 40, p2: 8, p3: 6, tu: 'QM', phach: true }),
      m({ ma: 'b', ho: 'A4-50 Bộ GD', p1: 50, p2: 0, p3: 0, tu: 'moi' }),
      m({ ma: 'c', ho: 'A5-50', p1: 50, p2: 0, p3: 0, tu: 'moi', phach: false }),
    ]
    expect(locMau(ds, { ho: 'A5-50' }).map(x => x.ma)).toEqual(['c'])
    expect(locMau(ds, { soCau: '40-08-06' }).map(x => x.ma)).toEqual(['a'])
    expect(locMau(ds, { phach: true }).map(x => x.ma)).toEqual(['a'])
    expect(locMau(ds, { tu: 'moi' }).map(x => x.ma)).toEqual(['b', 'c'])
    expect(locMau(ds, {}).length).toBe(3)
  })

  it('khuonDau lấy khuôn trang 0', () => {
    expect(khuonDau(m({ khuon: [{ trang: 0, clip: null, khuon: 'abc' }, { trang: 1, clip: null, khuon: 'def' }] }))).toBe('abc')
  })
})
