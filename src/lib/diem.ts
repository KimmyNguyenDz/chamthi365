import type { Bai, Diem, DocCham, DapAn, HocSinh } from '../types'

// 5 preset tính điểm — hệ số port nguyên từ app gốc
export const MAU_DIEM: { ma: string; ten: string; cfg: (soCau: { p1: number; p2: number; p3: number }) => Omit<Diem, 'mau' | 'soCau'> }[] = [
  { ma: 'toan-2025', ten: 'Toán 2025', cfg: () => ({ p1: .25, p2: [0, .1, .25, .5, 1], p3: .5, tuLuan: 0, truP1: 0, lamTron: .05, boSo0Sau: true, nhanPhayDau: true }) },
  { ma: 'mon-khac-2025', ten: 'Môn khác 2025', cfg: () => ({ p1: .25, p2: [0, .1, .25, .5, 1], p3: .25, tuLuan: 0, truP1: 0, lamTron: .05, boSo0Sau: true, nhanPhayDau: true }) },
  { ma: 'giua-ki', ten: 'Giữa kì · có tự luận', cfg: n => ({ p1: n.p1 ? +(3 / n.p1).toFixed(4) : 0, p2: [0, .1, .25, .5, 1], p3: n.p3 ? +(2 / n.p3).toFixed(4) : 0, tuLuan: 2, truP1: 0, lamTron: .25, boSo0Sau: true, nhanPhayDau: true }) },
  { ma: 'trac-nghiem-10', ten: 'Trắc nghiệm · thang 10', cfg: n => ({ p1: n.p1 ? +(10 / n.p1).toFixed(4) : 0, p2: [0, .1, .25, .5, 1], p3: n.p3 ? .25 : 0, tuLuan: 0, truP1: 0, lamTron: .01, boSo0Sau: true, nhanPhayDau: true }) },
  { ma: 'hsg', ten: 'HSG · có điểm trừ', cfg: () => ({ p1: .5, p2: [0, .25, .5, .75, 1], p3: 1, tuLuan: 0, truP1: .25, lamTron: 0, boSo0Sau: true, nhanPhayDau: true }) },
]

export function diemMau(ma: string, soCau: { p1: number; p2: number; p3: number }): Diem {
  const m = MAU_DIEM.find(x => x.ma === ma) ?? MAU_DIEM[0]
  return { mau: m.ma, soCau, ...m.cfg(soCau) }
}

/** Chuẩn hoá đáp số: "0.50"→"0,5" · ",5"→"0,5" (nhanPhayDau) · bỏ 0 đuôi (boSo0Sau) */
export function chuanDapSo(s: string, d: Diem): string {
  let v = s.trim().replace(/\./g, ',').replace(/\s+/g, '')
  if (d.nhanPhayDau) v = v.replace(/^(-?),/, '$10,')
  if (d.boSo0Sau && v.includes(',')) v = v.replace(/0+$/, '').replace(/,$/, '')
  if (v === '-0') v = '0'
  return v
}

const lamTron = (n: number, buoc: number) => (buoc > 0 ? Math.round(n / buoc + 1e-9) * buoc : n)
const tong = (a: number[]) => a.reduce((x, y) => x + y, 0)

const bo0Dau = (s: string) => s.replace(/^0+(?=\d)/, '')

/** Tìm đáp án theo mã (bỏ 0 đầu); bài chỉ 1 mã thì dùng luôn */
export function timDapAn(bai: Bai, ma: string): DapAn | undefined {
  return bai.dapAn.find(d => bo0Dau(d.ma) === bo0Dau(ma)) ?? (bai.dapAn.length === 1 ? bai.dapAn[0] : undefined)
}

export type KqDiem = {
  p1: { dung: boolean | null; diem: number }[]
  p2: { y: (boolean | null)[]; diem: number }[]
  p3: { dung: boolean | null; diem: number }[]
  phan: { p1: number; p2: number; p3: number; tuLuan: number }
  tong: number
  coDapAn: boolean
}

/** Chấm một phiếu: doc = bài đọc được, diemTL = điểm tự luận nhập tay */
export function chamPhieu(bai: Bai, doc: DocCham, diemTL = 0): KqDiem {
  const s = bai.diem
  const da = timDapAn(bai, doc.ma)
  const p1 = doc.p1.map((g, v) => {
    const y = da?.p1[v] ?? ''
    if (!y) return { dung: null, diem: 0 }
    if (y === '*') return { dung: true, diem: s.p1 }
    const d = g.length === 1 && y.includes(g)
    return { dung: d, diem: d ? s.p1 : g && s.truP1 ? -s.truP1 : 0 }
  })
  const p2 = doc.p2.map((g, v) => {
    const y = da?.p2[v] ?? ''
    if (!y) return { y: g.map(() => null), diem: 0 }
    const yy = g.map((x, i) => (y[i] === '*' ? true : !y[i] || y[i] === ' ' ? null : x === y[i]))
    return { y: yy, diem: s.p2[yy.filter(Boolean).length] ?? 0 }
  })
  const p3 = doc.p3.map((g, v) => {
    const y = da?.p3[v] ?? ''
    if (!y) return { dung: null, diem: 0 }
    if (y === '*') return { dung: true, diem: s.p3 }
    const d = !!g && y.split('/').some(x => chuanDapSo(x, s) === chuanDapSo(g, s))
    return { dung: d, diem: d ? s.p3 : 0 }
  })
  const phan = { p1: tong(p1.map(x => x.diem)), p2: tong(p2.map(x => x.diem)), p3: tong(p3.map(x => x.diem)), tuLuan: diemTL }
  const t = lamTron(Math.max(0, phan.p1 + phan.p2 + phan.p3 + diemTL), s.lamTron)
  return { p1, p2, p3, phan, tong: +t.toFixed(4), coDapAn: !!da }
}

/** "8,25" — phẩy, cắt số 0 đuôi */
export function dinhDangDiem(n: number, chuSo = 2): string {
  return (Math.round(n * 10 ** chuSo) / 10 ** chuSo).toString().replace('.', ',')
}

export const tongDiemToiDa = (d: Diem) => d.soCau.p1 * d.p1 + d.soCau.p2 * d.p2[4] + d.soCau.p3 * d.p3 + d.tuLuan

/** Khoảng cách giữa chuỗi đọc (có '?') và chuỗi đích cùng độ dài; -1 nếu khác độ dài */
export function khoangCach(docChuoi: string, dich: string): number {
  const s = dich.trim().padStart(docChuoi.length, '0')
  if (s.length !== docChuoi.length) return -1
  let k = 0
  for (let i = 0; i < docChuoi.length; i++) docChuoi[i] !== '?' && docChuoi[i] !== s[i] && k++
  return k
}

/** Gợi ý mã đề: khớp phần đã tô ('?' = chưa đọc), ưu tiên khớp hẳn, tối đa 24 */
export function timMaDe(bai: Bai, maDoc: string): { v: string; khop: boolean }[] {
  const coSo = /\d/.test(maDoc)
  const ds = [...new Set(bai.dapAn.map(d => d.ma))].map(v => ({ v, l: coSo ? khoangCach(maDoc, v) : -1 }))
  const tt = (l: number) => (l < 0 ? 9 : l)
  return ds.sort((a, b) => tt(a.l) - tt(b.l)).slice(0, 24).map(x => ({ v: x.v, khop: x.l === 0 }))
}

/** Gợi ý học sinh theo SBD (lệch ≤1 ký tự), tối đa 8 */
export function timHocSinh(
  bai: Bai,
  sbdDoc: string,
  daCham?: Set<string>,
): { v: string; ten: string; lop?: string; khop: boolean; xong: boolean }[] {
  const so = [...sbdDoc].filter(c => c !== '?').length
  if (!bai.hocSinh.length || so < Math.ceil(sbdDoc.length / 2)) return []
  const bo0 = (s: string) => s.replace(/^0+/, '')
  return bai.hocSinh
    .map(h => ({ h, l: khoangCach(sbdDoc, h.sbd), xong: !!daCham?.has(bo0(h.sbd)) }))
    .filter(x => x.l >= 0 && x.l <= 1)
    .sort((a, b) => a.l - b.l || Number(a.xong) - Number(b.xong))
    .slice(0, 8)
    .map(({ h, l, xong }) => ({ v: h.sbd, ten: h.ten, lop: h.lop, khop: l === 0, xong }))
}
