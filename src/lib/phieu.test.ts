import { describe, it, expect } from 'vitest'
import { canhBaoPhieu } from './phieu'
import { diemMau } from './diem'
import type { Bai, DocCham } from '../types'

const bai = (o: Partial<Bai> = {}): Bai => ({
  id: 'b', ten: 't', mon: 'Toán', lop: [], phieu: 'm', khuon: 'k',
  diem: diemMau('toan-2025', { p1: 12, p2: 4, p3: 6 }),
  dapAn: [{ ma: '1201', p1: [], p2: [], p3: [] }],
  hocSinh: [{ sbd: '10010201', ten: 'An' }],
  tao: 1, sua: 1, ...o,
})

const doc = (o: Partial<DocCham> = {}): DocCham => ({
  sbd: '10010201', ma: '1201', p1: [], p2: [], p3: [], ...o,
})

describe('canhBaoPhieu — đối chiếu danh sách & đáp án', () => {
  it('khớp đủ → không cảnh báo', () => {
    expect(canhBaoPhieu(bai(), doc())).toEqual([])
  })
  it('mã đề không có đáp án → cảnh báo tô sai mã đề', () => {
    const w = canhBaoPhieu(bai(), doc({ ma: '0101' }))
    expect(w.some(x => x.includes('mã đề'))).toBe(true)
  })
  it('mã đề đọc thiếu ? vẫn khớp được → không cảnh báo', () => {
    expect(canhBaoPhieu(bai(), doc({ ma: '120?' }))).toEqual([])
  })
  it('SBD không có trong danh sách → cảnh báo', () => {
    const w = canhBaoPhieu(bai(), doc({ sbd: '99999999' }))
    expect(w.some(x => x.includes('danh sách'))).toBe(true)
  })
  it('SBD tô thừa số 0 đầu vẫn khớp danh sách', () => {
    expect(canhBaoPhieu(bai(), doc({ sbd: '010010201' }))).toEqual([])
  })
  it('SBD trùng phiếu khác → cảnh báo trùng', () => {
    expect(canhBaoPhieu(bai(), doc(), true).some(x => x.includes('trùng'))).toBe(true)
  })
  it('boSbd (phiếu không lưới SBD) → bỏ qua mọi kiểm tra SBD', () => {
    expect(canhBaoPhieu(bai({ boSbd: true }), doc({ sbd: '' }))).toEqual([])
  })
  it('chưa có danh sách lớp → không cảnh báo SBD', () => {
    expect(canhBaoPhieu(bai({ hocSinh: [] }), doc({ sbd: '999' }))).toEqual([])
  })
})
