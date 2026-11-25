import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import { docDapAnExcel, aoaDapAn, docDanhSachExcel, vietBangDiemAoa, docDapAnChuoi, vietDanhSachExcelBytes, docDapAnQM } from './excel'
import { diemMau, chamPhieu } from './diem'
import type { Bai, Phieu, DocCham } from '../types'

const baiMau = (): Bai => ({
  id: 'b', ten: 'Giữa kì 1 · Toán 10', mon: 'Toán', lop: ['10A1'],
  phieu: 'm', khuon: 'k',
  diem: diemMau('toan-2025', { p1: 4, p2: 1, p3: 2 }),
  dapAn: [
    { ma: '101', p1: ['A', 'B', 'C', 'D'], p2: ['SĐĐĐ'], p3: ['0,5', '12'] },
    { ma: '102', p1: ['D', 'C', 'B', 'A'], p2: ['ĐĐSĐ'], p3: ['1', '-2,5'] },
  ],
  hocSinh: [{ sbd: '001', ten: 'Nguyễn Văn An', lop: '10A1' }],
  tao: 1, sua: 1,
})

const wb2buf = (wb: XLSX.WorkBook): ArrayBuffer =>
  XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer

describe('aoaDapAn + docDapAnExcel', () => {
  it('aoaDapAn xuất đúng khuôn Đề \\ Câu', () => {
    const b = baiMau()
    const aoa = aoaDapAn(b.diem.soCau, b.dapAn, [])
    expect(aoa[0][0]).toBe('Đề \\ Câu')
    expect(aoa[0].slice(1, 5)).toEqual([1, 2, 3, 4])
    expect(aoa[0].slice(5, 9)).toEqual(['1a', '1b', '1c', '1d'])
    expect(aoa[0].slice(9, 11)).toEqual([1, 2]) // p3 restarts numbering (đề 2025)
    expect(aoa[1]).toEqual(['101', 'A', 'B', 'C', 'D', 'S', 'Đ', 'Đ', 'Đ', '0,5', '12'])
  })

  it('docDapAnExcel round-trip', async () => {
    const b = baiMau()
    const aoa = aoaDapAn(b.diem.soCau, b.dapAn, [])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Đáp án')
    const { dapAn, soCau } = await docDapAnExcel(wb2buf(wb))
    expect(soCau).toEqual({ p1: 4, p2: 1, p3: 2 })
    expect(dapAn.length).toBe(2)
    expect(dapAn[0]).toEqual({ ma: '101', p1: ['A', 'B', 'C', 'D'], p2: ['SĐĐĐ'], p3: ['0,5', '12'] })
    expect(dapAn[1].p3).toEqual(['1', '-2,5'])
  })

  it('bỏ hàng trống hết đáp án, nhận D=Đ', async () => {
    const aoa = [
      ['Đề \\ Câu', 1, '1a', '1b', '1c', '1d', 1],
      ['101', 'A', 'D', 'S', 'D', 'S', '0.5'],
      ['102', '', '', '', '', '', ''],
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'x')
    const { dapAn, soCau } = await docDapAnExcel(wb2buf(wb))
    expect(dapAn.length).toBe(1)
    expect(dapAn[0].p2).toEqual(['ĐSĐS'])
    expect(dapAn[0].p3).toEqual(['0,5'])
    expect(soCau.p3).toBe(1)
  })

  it('không thấy hàng tiêu đề → lỗi tiếng Việt', async () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['a', 'b'], ['c', 'd']]), 'x')
    await expect(docDapAnExcel(wb2buf(wb))).rejects.toThrow('Đề')
  })
})

describe('docDanhSachExcel', () => {
  it('đọc SBD + Họ và tên + Lớp, header lệch chữ', async () => {
    const aoa = [
      ['STT', 'Số báo danh', 'Họ và tên', 'Lớp'],
      [1, '001', 'Nguyễn Văn An', '10A1'],
      [2, '002', 'Trần Thị Bình', '10A1'],
    ]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'x')
    const hs = await docDanhSachExcel(wb2buf(wb))
    expect(hs).toEqual([
      { sbd: '001', ten: 'Nguyễn Văn An', lop: '10A1' },
      { sbd: '002', ten: 'Trần Thị Bình', lop: '10A1' },
    ])
  })

  it('không có cột SBD → lỗi', async () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Tên'], ['An']]), 'x')
    await expect(docDanhSachExcel(wb2buf(wb))).rejects.toThrow('SBD')
  })

  it('file mẫu vietDanhSachExcelBytes parse round-trip', async () => {
    const u8 = vietDanhSachExcelBytes()
    const hs = await docDanhSachExcel(u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer)
    expect(hs).toEqual([
      { sbd: '10010201', ten: 'Nguyễn Văn An', lop: '10A1', ngaySinh: '15/03/2010' },
      { sbd: '10010202', ten: 'Trần Thị Bình', lop: '10A1', ngaySinh: '02/07/2010' },
      { sbd: '10010203', ten: 'Lê Minh Châu', lop: '10A1', ngaySinh: '28/11/2009' },
    ])
  })
})

describe('docDapAnQM — đáp án QR app QM', () => {
  const payload = '[["1112","B","B","B","C","A","B","B","B","C","C","D","B","S","D","D","D","D","D","S","S",-1.5,3.4,-1.5,3.2],["1114","A","D","D","A","B","B","B","C","A","C","C","D","D","S","D","S","D","D","S","D",2.91,1,2.91,9.6]]'
  it('parse nhiều mã: P1 chữ + P2 ý Đ/S theo nhóm 4 + P3 số', () => {
    const ds = docDapAnQM(payload)!
    expect(ds.length).toBe(2)
    expect(ds[0].ma).toBe('1112')
    expect(ds[0].p1).toEqual(['B', 'B', 'B', 'C', 'A', 'B', 'B', 'B', 'C', 'C', 'D', 'B'])
    expect(ds[0].p2).toEqual(['SĐĐĐ', 'ĐĐSS']) // 8 ý → 2 câu × 4 ý, D→Đ
    expect(ds[0].p3).toEqual(['-1,5', '3,4', '-1,5', '3,2'])
    expect(ds[1].p1.length).toBe(12)
    expect(ds[1].p2).toEqual(['ĐSĐS', 'ĐĐSĐ'])
  })
  it('chuỗi không phải JSON [[..]] → null', () => {
    expect(docDapAnQM('0101 ABCD')).toBeNull()
    expect(docDapAnQM('[1,2,3]')).toBeNull()
  })
})

describe('docDapAnChuoi', () => {
  it('parse chuỗi dán: mã + P1 + P2 4-ký-tự + P3 cách ;', () => {
    const d = docDapAnChuoi('101 ABCD ĐSĐS 0,5;1', { p1: 4, p2: 1, p3: 2 })
    expect(d.ma).toBe('101')
    expect(d.p1).toEqual(['A', 'B', 'C', 'D'])
    expect(d.p2).toEqual(['ĐSĐS'])
    expect(d.p3).toEqual(['0,5', '1'])
  })
})

describe('vietBangDiemAoa', () => {
  it('xuất bảng điểm + chi tiết + footer Chamthi365', () => {
    const b = baiMau()
    const docC: DocCham = { sbd: '001', ma: '101', p1: ['A', 'B', 'C', 'D'], p2: [['S', 'Đ', 'Đ', 'Đ']], p3: ['0,5', '12'] }
    const phieu: Phieu[] = [{ id: 'p1', baiId: 'b', stt: 1, nguon: 'tep', luc: 1, ok: true, kq: { doc: docC, can: [], o: [] }, sua: {} }]
    const { bangDiem, chiTiet } = vietBangDiemAoa(b, phieu, p => chamPhieu(b, p, 0))
    expect(bangDiem[0]).toEqual(['STT', 'SBD', 'Họ và tên', 'Ngày sinh', 'Lớp', 'Mã đề', 'Phần I', 'Phần II', 'Phần III', 'Tự luận', 'Tổng', 'Ghi chú'])
    expect(bangDiem[1][0]).toBe(1)
    expect(bangDiem[1][6]).toBe(1) // Phần I = 4×.25
    expect(bangDiem[1][10]).toBe(1 + 1 + 1) // tổng = 1 + 1(P2 4 ý) + 1(P3 2×.5)
    const footer = bangDiem[bangDiem.length - 1][0] as string
    expect(footer).toContain('Chamthi365')
    expect(footer).not.toContain('Thái Minh Nguyên')
    expect(chiTiet[0].slice(0, 3)).toEqual(['SBD', 'Họ và tên', 'Mã đề'])
    expect(chiTiet[1].slice(3, 7)).toEqual(['A', 'B', 'C', 'D'])
  })
})
