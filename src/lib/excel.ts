import * as XLSX from 'xlsx'
import type { Bai, DapAn, DocCham, HocSinh, Phieu } from '../types'
import type { KqDiem } from './diem'
import { docHieuLuc, timHocSinhSbd, khoaCan } from './phieu'

const Nn = (v: unknown): string => (v == null ? '' : String(v).trim())
const qS = (v: unknown): string =>
  typeof v === 'number' ? String(+v.toFixed(6)).replace('.', ',') : Nn(v).replace(/\./g, ',')

// ---------- ĐÁP ÁN ----------

/** Hàng tiêu đề "Đề \ Câu | 1 | 2 | … | 1a..1d | 1 | 2 | …" + các hàng mã đề */
export function aoaDapAn(
  soCau: { p1: number; p2: number; p3: number },
  dapAn: DapAn[],
  maMacDinh: string[] = [],
): (string | number)[][] {
  const td: (string | number)[] = ['Đề \\ Câu']
  for (let i = 1; i <= soCau.p1; i++) td.push(i)
  for (let i = 1; i <= soCau.p2; i++) for (const y of 'abcd') td.push(`${i}${y}`)
  for (let i = 1; i <= soCau.p3; i++) td.push(i)
  const hang = (d: DapAn): (string | number)[] => {
    const h: (string | number)[] = [d.ma]
    for (let i = 0; i < soCau.p1; i++) h.push(d.p1[i] || '')
    for (let i = 0; i < soCau.p2; i++) for (let y = 0; y < 4; y++) h.push((d.p2[i] ?? '')[y]?.trim() ?? '')
    for (let i = 0; i < soCau.p3; i++) h.push(d.p3[i] || '')
    return h
  }
  const co = dapAn.filter(d => [...d.p1, ...d.p2, ...d.p3].some(v => (v ?? '').trim()))
  const ds = (co.length ? co : maMacDinh.map(ma => ({ ma, p1: [], p2: [], p3: [] }) as DapAn))
  return [td, ...ds.map(hang)]
}

/** Đọc tệp Excel đáp án (khuôn app + QM): hàng tiêu đề "Đề \ Câu", cột số = P1, cột Na-d = P2, cột số sau = P3 */
export async function docDapAnExcel(buf: ArrayBuffer): Promise<{ dapAn: DapAn[]; soCau: { p1: number; p2: number; p3: number } }> {
  const wb = XLSX.read(buf, { type: 'array' })
  const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, raw: true })
  const hd = rows.findIndex(r =>
    r.some(v => /^\d+[a-d]$/i.test(Nn(v))) ||
    (r.filter(v => Nn(v) === '1').length >= 1 && /đề|ma|mã/i.test(Nn(r[0]))))
  if (hd < 0) throw new Error('Không thấy hàng tiêu đề "Đề \\ Câu | 1 | 2 | …" trong tệp')
  const tieuDe = rows[hd].map(Nn)
  const cot: { phan: 1 | 2 | 3; cau: number; y?: number; i: number }[] = []
  let sangP2 = false, p1max = 0
  tieuDe.forEach((h, i) => {
    if (i === 0) return
    const y = /^(\d+)([a-d])$/i.exec(h)
    if (y) { sangP2 = true; cot.push({ phan: 2, cau: +y[1], y: 'abcd'.indexOf(y[2].toLowerCase()), i }); return }
    if (/^\d+$/.test(h)) {
      if (!sangP2 && +h <= p1max) sangP2 = true
      if (!sangP2) p1max = +h
      cot.push({ phan: sangP2 ? 3 : 1, cau: +h, i })
    }
  })
  const soCau = { p1: 0, p2: 0, p3: 0 }
  const dapAn: DapAn[] = []
  for (const r of rows.slice(hd + 1)) {
    const ma = Nn(r[0])
    if (!ma || cot.every(c => !Nn(r[c.i]))) continue
    const d: DapAn = { ma, p1: [], p2: [], p3: [] }
    for (const c of cot) {
      const v = r[c.i]
      if (c.phan === 1) {
        const s = Nn(v).toUpperCase()
        d.p1[c.cau - 1] = s
        s && (soCau.p1 = Math.max(soCau.p1, c.cau))
      } else if (c.phan === 2) {
        const s = Nn(v).toUpperCase().replace(/^D$/, 'Đ').replace(/^Đ.*/, 'Đ').replace(/^S.*/, 'S')
        const y = (d.p2[c.cau - 1] ?? '    ').split('')
        y[c.y!] = s || ' '
        d.p2[c.cau - 1] = y.join('')
        s && (soCau.p2 = Math.max(soCau.p2, c.cau))
      } else {
        const s = qS(v)
        d.p3[c.cau - 1] = s
        s && (soCau.p3 = Math.max(soCau.p3, c.cau))
      }
    }
    d.p1 = Array.from({ length: soCau.p1 }, (_, i) => d.p1[i] ?? '')
    d.p2 = Array.from({ length: soCau.p2 }, (_, i) => (d.p2[i] ?? '').trimEnd())
    d.p3 = Array.from({ length: soCau.p3 }, (_, i) => d.p3[i] ?? '')
    dapAn.push(d)
  }
  // soCau cần tính theo header tối đa (không chỉ ô có giá trị)
  for (const c of cot) {
    if (c.phan === 1) soCau.p1 = Math.max(soCau.p1, c.cau)
    else if (c.phan === 2) soCau.p2 = Math.max(soCau.p2, c.cau)
    else soCau.p3 = Math.max(soCau.p3, c.cau)
  }
  // pad lại theo soCau cuối
  for (const d of dapAn) {
    d.p1 = Array.from({ length: soCau.p1 }, (_, i) => d.p1[i] ?? '')
    d.p2 = Array.from({ length: soCau.p2 }, (_, i) => (d.p2[i] ?? '').trimEnd())
    d.p3 = Array.from({ length: soCau.p3 }, (_, i) => d.p3[i] ?? '')
  }
  if (!dapAn.length) throw new Error('Tệp không có mã đề nào')
  return { dapAn, soCau }
}

/** File Excel mẫu/đáp án hiện có, kèm sheet hướng dẫn — trả về bytes xlsx */
export function vietDapAnExcelBytes(bai: Bai, chiMau = false): Uint8Array {
  const aoa = aoaDapAn(bai.diem.soCau, chiMau ? [] : bai.dapAn, bai.dapAn.map(d => d.ma))
  const sh = XLSX.utils.aoa_to_sheet(aoa)
  sh['!cols'] = [{ wch: 10 }, ...aoa[0].slice(1).map(() => ({ wch: 5 }))]
  const i = bai.diem.soCau
  const f = i.p2 ? 'Phần II mỗi ý một ô, ghi Đ (hoặc D) là Đúng, S là Sai; cột 1a là câu 1 ý a. ' : ''
  const huongDan = XLSX.utils.aoa_to_sheet([
    ['CÁCH ĐIỀN TỆP ĐÁP ÁN'], [],
    ['1. Trang "Đáp án": mỗi hàng là một mã đề. Cột đầu ghi mã đề đúng như học sinh tô trên phiếu.'],
    ['   Hàng mã đề để trống hết đáp án sẽ được bỏ qua: thừa hàng ví dụ cũng không sao, thiếu thì chép thêm hàng.'],
    [`2. Phần I (cột 1 → ${i.p1 || '…'}): ghi một chữ A, B, C hoặc D. Câu nhận 2 đáp án ghi liền "AB". Câu huỷ (ai cũng được điểm) ghi *.`],
    [`3. ${f || 'Phần II: bài này không có.'}`],
    [`4. Phần III (cột 1 → ${i.p3 || '…'} sau Phần II): ghi đáp số, dấu phẩy hay dấu chấm đều được (0,5 hoặc 0.5). Nhiều đáp số đúng: 0,5/1. Huỷ câu: *.`],
    ['5. Đừng sửa hàng tiêu đề (Đề \\ Câu, 1, 2, …, 1a, 1b, …). Lưu tệp rồi vào app bấm "Nạp Excel".'], [],
    [`Tệp tạo cho bài "${bai.ten}": ${i.p1} câu Phần I · ${i.p2} câu Phần II · ${i.p3} câu Phần III.`],
    ['Chấm bằng Chamthi365'],
  ])
  huongDan['!cols'] = [{ wch: 110 }]
  const wb = XLSX.utils.book_new()
  wb.Props = { Title: `${bai.ten} - đáp án`, Author: 'Chamthi365', Company: 'Chamthi365' }
  XLSX.utils.book_append_sheet(wb, sh, 'Đáp án')
  XLSX.utils.book_append_sheet(wb, huongDan, 'Hướng dẫn')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array
}

/** Đáp án xuất từ app QM (QR/file): JSON [["1112","B","B",…,"S","D",…,-1.5,3.2], …]
 *  Cấu trúc hàng: [mã, P1 chữ, P2 phẳng các ý Đ/S (4 ý/câu), P3 số] */
export function docDapAnQM(t: string, soCau?: { p1: number; p2: number; p3: number }): DapAn[] | null {
  const s = t.trim()
  if (!s.startsWith('[[')) return null
  let arr: unknown
  try { arr = JSON.parse(s) } catch { return null }
  if (!Array.isArray(arr) || !arr.every(r => Array.isArray(r) && r.length > 1)) return null
  const out: DapAn[] = []
  for (const r of arr as unknown[][]) {
    const ma = Nn(r[0])
    if (!ma) continue
    const vals = r.slice(1)
    // P3 = đuôi là số (kiểu number hoặc chuỗi số)
    const p3: string[] = []
    while (vals.length && (typeof vals[vals.length - 1] === 'number' || /^-?\d+([.,]\d+)?$/.test(Nn(vals[vals.length - 1]))))
      p3.unshift(qS(vals.pop()))
    // P2 = đuôi chỉ {Đ,D,S} — 'D' trùng chữ P1 nên cắt theo bội số 4 (4 ý/câu)
    const letters = vals.map(v => Nn(v).toUpperCase())
    let n2 = 0
    while (n2 < letters.length && /^[ĐSD]$/.test(letters[letters.length - 1 - n2])) n2++
    if (soCau && n2 > soCau.p2 * 4) n2 = soCau.p2 * 4
    while (n2 > 0 && n2 % 4 && letters[letters.length - n2] === 'D') n2--
    if (n2 % 4) n2 = 0
    const p1 = letters.slice(0, letters.length - n2)
    const p2f = letters.slice(letters.length - n2).map(c => (c === 'D' ? 'Đ' : c))
    const p2: string[] = []
    for (let i = 0; i < p2f.length; i += 4) p2.push(p2f.slice(i, i + 4).join(''))
    out.push({ ma, p1, p2, p3 })
  }
  return out.length ? out : null
}

/** Chuỗi dán: "101 ABCD ĐSĐS 0,5;1" */
export function docDapAnChuoi(chuoi: string, soCau: { p1: number; p2: number; p3: number }): DapAn {
  const t = chuoi.trim().split(/\s+/).filter(Boolean)
  const ma = t[0] ?? ''
  const d: DapAn = { ma, p1: [], p2: [], p3: [] }
  let idx = 1
  // P1: gom các token chỉ gồm ABCD* tới đủ số câu
  const p1: string[] = []
  while (idx < t.length && /^[ABCD*]+$/i.test(t[idx]) && p1.length < soCau.p1) {
    p1.push(...t[idx].toUpperCase().split(''))
    idx++
  }
  d.p1 = p1.slice(0, soCau.p1)
  // P2: token Đ/S dài đúng 4 ký tự (cho phép dán liền nhiều câu: 4×p2 ký tự)
  if (soCau.p2) {
    const p2goc = t.slice(idx).find(x => /^[ĐSđsDd]+$/i.test(x))
    if (p2goc) {
      const s = p2goc.toUpperCase().replace(/D/g, 'Đ')
      for (let i = 0; i < soCau.p2 && i * 4 < s.length; i++) d.p2.push(s.slice(i * 4, i * 4 + 4))
      idx += t.indexOf(p2goc, idx) - idx + 1
    }
  }
  // P3: phần còn lại, cách nhau bằng ;
  const p3 = t.slice(idx).join(' ').split(';').map(x => x.trim()).filter(Boolean)
  d.p3 = p3.slice(0, soCau.p3)
  return d
}

// ---------- DANH SÁCH HỌC SINH ----------

/** Ô ngày sinh: Date | serial Excel | chuỗi → "d/m/yyyy" hoặc giữ nguyên chuỗi */
const fmtNgaySinh = (v: unknown): string => {
  if (v == null || v === '') return ''
  if (v instanceof Date && !isNaN(+v)) return `${v.getDate()}/${v.getMonth() + 1}/${v.getFullYear()}`
  const n = Number(v)
  if (!isNaN(n) && n > 20000 && n < 70000) {
    const d = XLSX.SSF.parse_date_code(n)
    if (d) return `${d.d}/${d.m}/${d.y}`
  }
  return Nn(v)
}

export async function docDanhSachExcel(buf: ArrayBuffer): Promise<HocSinh[]> {
  const wb = XLSX.read(buf, { type: 'array', cellDates: true })
  const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, raw: true })
  const hd = rows.findIndex(r => r.some(v => /sbd|số báo danh/i.test(Nn(v))))
  if (hd < 0) {
    const dau = rows.slice(0, 3).map(r => r.map(Nn).filter(Boolean).join(' | ')).filter(Boolean).join(' — ')
    throw new Error(`Không thấy cột SBD trong tệp${dau ? ` (đầu tệp đang có: ${dau.slice(0, 120)})` : ''}`)
  }
  const tieuDe = rows[hd].map(Nn)
  const iSbd = tieuDe.findIndex(v => /sbd|số báo danh/i.test(v))
  const iTen = tieuDe.findIndex(v => /họ|tên/i.test(v))
  const iLop = tieuDe.findIndex(v => /lớp/i.test(v))
  const iNs = tieuDe.findIndex(v => /ngày sinh|sinh|dob|birth/i.test(v))
  const hs: HocSinh[] = []
  for (const r of rows.slice(hd + 1)) {
    const sbd = Nn(r[iSbd])
    if (!sbd) continue
    hs.push({
      sbd,
      ten: iTen >= 0 ? Nn(r[iTen]) : '',
      lop: iLop >= 0 ? Nn(r[iLop]) || undefined : undefined,
      ngaySinh: iNs >= 0 ? fmtNgaySinh(r[iNs]) || undefined : undefined,
    })
  }
  if (!hs.length) throw new Error('Tệp không có học sinh nào')
  return hs
}

/** File Excel mẫu danh sách lớp, kèm sheet hướng dẫn */
export function vietDanhSachExcelBytes(): Uint8Array {
  const ds = XLSX.utils.aoa_to_sheet([
    ['STT', 'SBD', 'Họ và tên', 'Ngày sinh', 'Lớp'],
    [1, '10010201', 'Nguyễn Văn An', '15/03/2010', '10A1'],
    [2, '10010202', 'Trần Thị Bình', '02/07/2010', '10A1'],
    [3, '10010203', 'Lê Minh Châu', '28/11/2009', '10A1'],
  ])
  ds['!cols'] = [{ wch: 5 }, { wch: 12 }, { wch: 28 }, { wch: 11 }, { wch: 8 }]
  const hd = XLSX.utils.aoa_to_sheet([
    ['CÁCH ĐIỀN DANH SÁCH LỚP'], [],
    ['1. Trang "Danh sách": mỗi hàng là một học sinh.'],
    ['2. Cột SBD (hoặc "Số báo danh") là BẮT BUỘC — ghi đủ số như học sinh tô trên phiếu'],
    ['   (phiếu 8 cột thì ghi 8 số, ví dụ 10010201).'],
    ['3. Cột "Họ và tên" nên có để bảng điểm hiện tên; cột "Ngày sinh" giúp phân biệt'],
    ['   2 em trùng tên; cột "Lớp" tuỳ chọn. Ngày sinh ghi dạng ngày/tháng/năm.'],
    ['4. Hàng tiêu đề đặt ở đâu cũng được, miễn có chữ SBD trong một ô.'],
    ['   Các hàng trống hoặc không có SBD sẽ bị bỏ qua.'],
    ['5. Có thể dùng tệp Excel lớp sẵn có của nhà trường — chỉ cần đổi tên cột'],
    ['   thành "SBD" / "Họ và tên" cho máy nhận ra.'], [],
    ['Chấm bằng Chamthi365'],
  ])
  hd['!cols'] = [{ wch: 90 }]
  const wb = XLSX.utils.book_new()
  wb.Props = { Title: 'Danh sách lớp - mẫu', Author: 'Chamthi365', Company: 'Chamthi365' }
  XLSX.utils.book_append_sheet(wb, ds, 'Danh sách')
  XLSX.utils.book_append_sheet(wb, hd, 'Hướng dẫn')
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as unknown as number[])
}

// ---------- BẢNG ĐIỂM ----------

export function vietBangDiemAoa(
  bai: Bai,
  ds: Phieu[],
  cham: (doc: DocCham) => KqDiem | null,
): { bangDiem: (string | number)[][]; chiTiet: (string | number)[][] } {
  const { soCau } = bai.diem
  const bangDiem: (string | number)[][] = [['STT', 'SBD', 'Họ và tên', 'Ngày sinh', 'Lớp', 'Mã đề', 'Phần I', 'Phần II', 'Phần III', 'Tự luận', 'Tổng', 'Ghi chú']]
  const chiTiet: (string | number)[][] = [[
    'SBD', 'Họ và tên', 'Mã đề',
    ...Array.from({ length: soCau.p1 }, (_, i) => `P1.${i + 1}`),
    ...Array.from({ length: soCau.p2 }, (_, i) => `P2.${i + 1}`),
    ...Array.from({ length: soCau.p3 }, (_, i) => `P3.${i + 1}`),
  ]]
  let stt = 0
  for (const p of ds) {
    const d = docHieuLuc(p, bai.boSbd)
    if (!d) continue
    const kq = cham(d)
    const hs = timHocSinhSbd(bai, d.sbd)
    const can = new Set(d.can.map(khoaCan))
    const ghiChu = [
      !hs && bai.hocSinh.length && !bai.boSbd ? 'SBD không có trong danh sách' : '',
      kq && !kq.coDapAn ? 'chưa có đáp án mã này' : '',
      can.size ? `còn ${can.size} chỗ cần xem` : '',
    ].filter(Boolean).join('; ')
    bangDiem.push([
      ++stt, d.sbd, hs?.ten ?? '', hs?.ngaySinh ?? '', hs?.lop ?? '', d.ma,
      kq?.phan.p1 ?? '', kq?.phan.p2 ?? '', kq?.phan.p3 ?? '', d.tuLuan ?? '', kq?.tong ?? '', ghiChu,
    ])
    chiTiet.push([
      d.sbd, hs?.ten ?? '', d.ma,
      ...d.p1.map((v, i) => (can.has(`p1:${i + 1}`) ? v + '?' : v || '—')),
      ...d.p2.map((g, i) => g.map((x, y) => (can.has(`p2:${i + 1}:${y}`) ? '?' : x || '_')).join('')),
      ...d.p3.map((v, i) => (can.has(`p3:${i + 1}`) ? v + '?' : v || '—')),
    ])
  }
  bangDiem.push([], ['Chấm bằng Chamthi365'])
  return { bangDiem, chiTiet }
}

export function vietBangDiemBytes(bai: Bai, ds: Phieu[], cham: (doc: DocCham) => KqDiem | null): Uint8Array {
  const { bangDiem, chiTiet } = vietBangDiemAoa(bai, ds, cham)
  const wb = XLSX.utils.book_new()
  wb.Props = { Title: `${bai.ten} - bảng điểm`, Author: 'Chamthi365', Company: 'Chamthi365' }
  const sh = XLSX.utils.aoa_to_sheet(bangDiem)
  sh['!cols'] = [{ wch: 5 }, { wch: 11 }, { wch: 26 }, { wch: 7 }, { wch: 7 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 7 }, { wch: 34 }]
  XLSX.utils.book_append_sheet(wb, sh, 'Bảng điểm')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(chiTiet), 'Chi tiết')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as Uint8Array
}
