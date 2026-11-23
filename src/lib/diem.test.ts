import { describe, it, expect } from 'vitest'
import { diemMau, chamPhieu, dinhDangDiem, timMaDe, timHocSinh, chuanDapSo, MAU_DIEM } from './diem'
import type { Bai, DocCham } from '../types'

const baiMau = (x: Partial<Bai> = {}): Bai => ({
  id: 'b', ten: 'B', mon: 'Toán', lop: [], phieu: 'm', khuon: 'k',
  diem: diemMau('toan-2025', { p1: 12, p2: 4, p3: 6 }),
  dapAn: [{
    ma: '0101',
    p1: ['A', 'B', 'C', 'D', 'AB', '*', 'A', 'B', 'C', 'D', 'A', 'B'],
    p2: ['SĐĐĐ', 'ĐSĐĐ', 'ĐĐSS', 'ĐĐSĐ'],
    p3: ['0,25', '12', '1,5', '250', '-0,5', '3,14'],
  }],
  hocSinh: [{ sbd: '001', ten: 'Nguyễn Văn An', lop: '10A1' }],
  tao: 1, sua: 1, ...x,
})

const doc = (x: Partial<DocCham>): DocCham => ({
  sbd: '001', ma: '0101', p1: [], p2: [], p3: [], ...x,
})

describe('diemMau presets', () => {
  it('toan-2025: P1 .25, P2 bậc, P3 .5, làm tròn .05', () => {
    const d = diemMau('toan-2025', { p1: 12, p2: 4, p3: 6 })
    expect(d.p1).toBe(.25)
    expect(d.p2).toEqual([0, .1, .25, .5, 1])
    expect(d.p3).toBe(.5)
    expect(d.lamTron).toBe(.05)
    expect(d.boSo0Sau && d.nhanPhayDau).toBe(true)
  })
  it('mon-khac-2025: p3 .25', () => {
    expect(diemMau('mon-khac-2025', { p1: 12, p2: 4, p3: 6 }).p3).toBe(.25)
  })
  it('giua-ki: p1 tổng 3, p3 tổng 2, tự luận 2, làm tròn .25', () => {
    const d = diemMau('giua-ki', { p1: 12, p2: 4, p3: 6 })
    expect(d.p1).toBeCloseTo(3 / 12, 4)
    expect(d.p3).toBeCloseTo(2 / 6, 4)
    expect(d.tuLuan).toBe(2)
    expect(d.lamTron).toBe(.25)
  })
  it('trac-nghiem-10: thang 10 chia đều', () => {
    const d = diemMau('trac-nghiem-10', { p1: 50, p2: 0, p3: 0 })
    expect(d.p1).toBeCloseTo(.2, 4)
    expect(d.lamTron).toBe(.01)
  })
  it('hsg: trừ .25 mỗi câu sai', () => {
    const d = diemMau('hsg', { p1: 10, p2: 4, p3: 3 })
    expect(d.p1).toBe(.5)
    expect(d.truP1).toBe(.25)
    expect(d.p2).toEqual([0, .25, .5, .75, 1])
    expect(d.lamTron).toBe(0)
  })
  it('mã lạ → fallback preset đầu', () => {
    expect(diemMau('khong-co', { p1: 1, p2: 0, p3: 0 }).mau).toBe('toan-2025')
  })
})

describe('chamPhieu', () => {
  it('chấm đúng P1/P2/P3 và tổng', () => {
    const b = baiMau()
    const kq = chamPhieu(b, doc({
      p1: ['A', 'B', 'C', 'D', 'A', '', 'C', 'B', 'C', 'D', 'A', 'B'],
      p2: [['S'], ['Đ', 'S'], ['Đ', 'Đ', 'S', 'S'], ['S']],
      p3: ['0,25', '12', '1,5', '250', '-0,5', '3,14'],
    }))
    // P1: câu 5 đáp án "AB" chỉ tô A → vẫn đúng (y.includes(g)); câu 6 "*" được điểm; câu 7 tô C sai
    expect(kq.p1[4].dung).toBe(true)
    expect(kq.p1[5].dung).toBe(true)
    expect(kq.p1[6].dung).toBe(false)
    // P2 câu1 "SĐĐĐ" học sinh ý1 S → 1 ý đúng → .1
    expect(kq.p2[0].diem).toBeCloseTo(.1)
    // P2 câu3 "ĐĐSS" học sinh đủ 4 ý đúng → 1
    expect(kq.p2[2].diem).toBe(1)
    expect(kq.p3.every(x => x.dung)).toBe(true)
    expect(kq.coDapAn).toBe(true)
    // tổng: 11 câu P1 đúng×.25 + P2 (1+2+4+0 ý → .1+.25+1+0) + 6 P3 × .5 = 7.1
    expect(kq.tong).toBeCloseTo(
      (11 * .25) + (.1 + .25 + 1 + 0) + (6 * .5), 4,
    )
  })

  it('học sinh tô 2 ô P1 → sai', () => {
    const kq = chamPhieu(baiMau(), doc({ p1: ['AB'] }))
    expect(kq.p1[0].dung).toBe(false)
  })

  it('hsg trừ điểm câu sai, không trừ câu bỏ trống', () => {
    const b = baiMau({
      diem: diemMau('hsg', { p1: 2, p2: 0, p3: 0 }),
      dapAn: [{ ma: '1', p1: ['A', 'B'], p2: [], p3: [] }],
    })
    const kq = chamPhieu(b, doc({ ma: '1', p1: ['B', ''] }))
    expect(kq.p1[0].diem).toBe(-.25)
    expect(kq.p1[1].diem).toBe(0)
    expect(kq.tong).toBe(0) // max(0,…)
  })

  it('P3 khớp 0,50↔0,5 (boSo0Sau) và ,5↔0,5 (nhanPhayDau)', () => {
    const b = baiMau({ dapAn: [{ ma: '1', p1: [], p2: [], p3: ['0,5'] }] })
    b.diem.soCau = { p1: 0, p2: 0, p3: 1 }
    expect(chamPhieu(b, doc({ ma: '1', p3: ['0,50'] })).p3[0].dung).toBe(true)
    expect(chamPhieu(b, doc({ ma: '1', p3: [',5'] })).p3[0].dung).toBe(true)
    expect(chamPhieu(b, doc({ ma: '1', p3: ['0.5'] })).p3[0].dung).toBe(true)
  })

  it('P3 nhiều đáp số "0,5/1"', () => {
    const b = baiMau({ dapAn: [{ ma: '1', p1: [], p2: [], p3: ['0,5/1'] }] })
    b.diem.soCau = { p1: 0, p2: 0, p3: 1 }
    expect(chamPhieu(b, doc({ ma: '1', p3: ['1'] })).p3[0].dung).toBe(true)
    expect(chamPhieu(b, doc({ ma: '1', p3: ['0,5'] })).p3[0].dung).toBe(true)
    expect(chamPhieu(b, doc({ ma: '1', p3: ['2'] })).p3[0].dung).toBe(false)
  })

  it('câu huỷ "*" ai cũng điểm, mã đề khớp bỏ số 0 đầu', () => {
    const b = baiMau()
    b.dapAn.push({ ma: '0202', p1: [], p2: [], p3: [] }) // 2 mã → không fallback
    const kq = chamPhieu(b, doc({ ma: '101' })) // '0101' ~ '101'
    expect(kq.coDapAn).toBe(true)
    const kq2 = chamPhieu(b, doc({ ma: '9999' }))
    expect(kq2.coDapAn).toBe(false)
    expect(kq2.tong).toBe(0)
    // bài 1 mã: mọi mã đều dùng mã đó (giống app gốc)
    const b1 = baiMau()
    expect(chamPhieu(b1, doc({ ma: '9999' })).coDapAn).toBe(true)
  })

  it('làm tròn .05 và .25', () => {
    const b = baiMau()
    b.diem.lamTron = .25
    b.dapAn = [{ ma: '1', p1: ['A'], p2: [], p3: [] }]
    b.diem.soCau = { p1: 1, p2: 0, p3: 0 }
    // 1 câu đúng = .25 → giữ; sai = 0
    expect(chamPhieu(b, doc({ ma: '1', p1: ['A'] })).tong).toBe(.25)
    // tong = .3 → làm tròn .25
    const b2 = baiMau()
    b2.diem = { ...b2.diem, lamTron: .25, p1: .3 }
    b2.dapAn = [{ ma: '1', p1: ['A'], p2: [], p3: [] }]
    expect(chamPhieu(b2, doc({ ma: '1', p1: ['A'] })).tong).toBe(.25)
  })
})

describe('chuẩn hoá đáp số', () => {
  it('chuanDapSo các dạng', () => {
    const d = diemMau('toan-2025', { p1: 0, p2: 0, p3: 0 })
    expect(chuanDapSo('0.50', d)).toBe('0,5')
    expect(chuanDapSo(',5', d)).toBe('0,5')
    expect(chuanDapSo('-0', d)).toBe('0')
    expect(chuanDapSo(' -,5 ', d)).toBe('-0,5')
  })
})

describe('timMaDe / timHocSinh', () => {
  it('gợi ý mã đề khớp phần đã tô', () => {
    const b = baiMau()
    b.dapAn.push({ ma: '0202', p1: [], p2: [], p3: [] })
    const g = timMaDe(b, '01?1')
    expect(g[0].v).toBe('0101')
    expect(g[0].khop).toBe(true)
  })
  it('gợi ý học sinh theo SBD gần đúng', () => {
    const b = baiMau()
    const g = timHocSinh(b, '00?')
    expect(g[0].v).toBe('001')
    expect(g[0].ten).toBe('Nguyễn Văn An')
    expect(timHocSinh(b, '999')).toEqual([])
  })
})

describe('dinhDangDiem', () => {
  it('phẩy thập phân, cắt số 0', () => {
    expect(dinhDangDiem(8.25)).toBe('8,25')
    expect(dinhDangDiem(10)).toBe('10')
    expect(dinhDangDiem(0.5)).toBe('0,5')
  })
})
