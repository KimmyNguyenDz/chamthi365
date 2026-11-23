// Parse đề Word thành mô hình trộn được — quy tắc port từ app gốc
import type { Doan, DocGoc } from './docx-doc'
import type { XmlEl } from './xml'

export type Pa = { chu: string; doan: Doan; dung: boolean; gim: boolean }
export type Cau = {
  nhan: string; loai: 'tn' | 'ds' | 'tln' | 'tl'
  doan: Doan[]            // toàn bộ đoạn của câu (nhan + than)
  pa: Pa[]                // phương án tn (thường 4)
  y: ('Đ' | 'S' | '')[]   // đáp án ý đúng/sai (ds)
  dapSo: string | null    // đáp số (tln)
  canhBao: string[]
}
export type Nhom = { muc: number; khongTron: boolean; cau: Cau[] }
export type Phan = { so: number; loai: Cau['loai']; nhom: Nhom[] }
export type De = {
  dau: Doan[]             // phần đầu trước PHẦN I (tiêu đề, hướng dẫn)
  phan: Phan[]
  duoi: Doan[]            // đuôi sau đề (đáp án tổng hợp, lời giải tách…)
  loi: string[]           // lỗi parse nghiêm trọng
  canhBao: string[]
}

const RE_CAU = /^[\s￼]*(C(?:â|â|a)u|Question)\s*(\d+)\s*(\([^)]{0,30}\))?\s*([.:])/i
const RE_NHOM = /^<\s*(#?)\s*g\s*([0-3])\s*(?:#\s*([1-4]))?\s*>$/i
const RE_PHAN = /^PH\S{1,3}N\s+(IV|I{1,3}|[1-4])(?![A-Za-z])/i
const RE_GIAI = /^\s*(Lời giải|Hướng dẫn giải|Hướng dẫn|HDG|Giải chi tiết|Giải\s*[:.]|Chọn\s+(đáp án\s+)?[A-D]\b|Đáp án\s*[:.]?\s*[A-D]\b)/i
const RE_DAPSO = /^\s*(?:Đáp số|Đáp án|ĐS|Trả lời|Kết quả)\s*[:.]\s*([-−]?\S.*)$/i
const RE_DUOI = /^(PHIẾU TRẢ LỜI|BẢNG ĐÁP ÁN|ĐÁP ÁN VÀ (LỜI GIẢI|HƯỚNG DẪN)|ĐÁP ÁN (THAM KHẢO|CHI TIẾT)|HƯỚNG DẪN (GIẢI|CHẤM)|LỜI GIẢI (CHI TIẾT|THAM KHẢO)|PHẦN ĐÁP ÁN|ĐÁP ÁN)(?![\p{L}\d])/u
const RE_PA = /^[\s￼]*([#*]?)\s*([A-DАΑ])\s*[.)]\s*/u
const RE_Y = /^[\s￼]*([#*]?)\s*([a-dаα])\s*\)/u

const SO_PHAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, 1: 1, 2: 2, 3: 3, 4: 4 }
const LOAI_PHAN: Record<number, Cau['loai']> = { 1: 'tn', 2: 'ds', 3: 'tln', 4: 'tl' }

/** Chữ cái phương án được đánh dấu (gạch chân hoặc đỏ) trong đoạn */
export function danhDauDung(d: Doan, chuRe: RegExp): boolean {
  for (const r of d.runs) {
    if ((r.u || r.do_) && chuRe.test(r.txt)) return true
  }
  return false
}

export function parseDe(goc: DocGoc): De {
  const de: De = { dau: [], phan: [], duoi: [], loi: [], canhBao: [] }
  let phan: Phan | null = null
  let nhom: Nhom | null = null
  let cau: Cau | null = null
  let trongGiai = false
  let trongDuoi = false

  const damBaoPhan = (so: number): Phan => {
    let p = de.phan.find(x => x.so === so)
    if (!p) { p = { so, loai: LOAI_PHAN[so] ?? 'tn', nhom: [] }; de.phan.push(p); de.phan.sort((a, b) => a.so - b.so) }
    return p
  }
  const damBaoNhom = (p: Phan): Nhom => {
    if (!nhom || nhom.cau === undefined || !p.nhom.includes(nhom)) {
      nhom = p.nhom[p.nhom.length - 1] ?? { muc: 2, khongTron: false, cau: [] }
      if (!p.nhom.includes(nhom)) p.nhom.push(nhom)
    }
    return nhom
  }

  for (const d of goc.doan) {
    const t = d.txt.replace(/￼/g, '').trim()
    if (!t) { if (cau) cau.doan.push(d); else if (trongDuoi) de.duoi.push(d); else de.dau.push(d); continue }

    if (trongDuoi || RE_DUOI.test(t)) { trongDuoi = true; de.duoi.push(d); continue }

    const mNhom = RE_NHOM.exec(t)
    if (mNhom) {
      const p = damBaoPhan(phan?.so ?? 1)
      nhom = { muc: +mNhom[2], khongTron: !!mNhom[1] || +mNhom[2] === 0, cau: [] }
      p.nhom.push(nhom)
      cau = null
      continue
    }

    const mPhan = RE_PHAN.exec(t)
    if (mPhan) {
      phan = damBaoPhan(SO_PHAN[mPhan[1]] ?? 1)
      nhom = null; cau = null; trongGiai = false
      de.dau.length ? undefined : de.dau.push(d) // giữ đoạn PHẦN trong phần đầu? không — bỏ qua, tái tạo khi ghi
      continue
    }

    const mCau = RE_CAU.exec(t)
    if (mCau) {
      const p = damBaoPhan(phan?.so ?? 1)
      const n = damBaoNhom(p)
      cau = { nhan: mCau[2], loai: p.loai, doan: [d], pa: [], y: [], dapSo: null, canhBao: [] }
      n.cau.push(cau)
      trongGiai = false
      continue
    }

    if (!cau) { de.dau.push(d); continue }

    if (RE_GIAI.test(t)) { trongGiai = true; cau.doan.push(d); continue }
    if (trongGiai) { cau.doan.push(d); continue }

    // Ý đúng/sai (ds) hoặc phương án (tn)
    if (cau.loai === 'ds') {
      const my = RE_Y.exec(t)
      if (my) {
        cau.y.push(danhDauDung(d, new RegExp('^\\s*[#*]?\\s*' + my[2], 'i')) ? 'Đ' : 'S')
        cau.doan.push(d)
        continue
      }
    }
    const mPa = RE_PA.exec(t)
    if (mPa && (cau.loai === 'tn' || cau.loai === 'ds')) {
      cau.pa.push({ chu: mPa[2].toUpperCase(), doan: d, dung: danhDauDung(d, new RegExp('^\\s*[#*]?\\s*' + mPa[2], 'i')), gim: mPa[1] === '#' || mPa[1] === '*' })
      cau.doan.push(d)
      continue
    }

    const mDs = RE_DAPSO.exec(t)
    if (mDs && (cau.loai === 'tln' || cau.loai === 'tl')) { cau.dapSo = mDs[1].trim(); cau.doan.push(d); continue }

    cau.doan.push(d)
  }

  // Kiểm tra & cảnh báo
  for (const p of de.phan) for (const n of p.nhom) for (const c of n.cau) {
    if (c.loai === 'tn' && c.pa.length && !c.pa.some(x => x.dung))
      c.canhBao.push(`Câu ${c.nhan}: chưa đánh dấu đáp án đúng (gạch chân hoặc tô đỏ chữ cái A/B/C/D)`)
    if (c.loai === 'tn' && !c.pa.length)
      c.canhBao.push(`Câu ${c.nhan}: không thấy phương án — đáp án phải xuống dòng và bắt đầu bằng A. B. C. D.`)
    if (c.loai === 'ds' && !c.y.length)
      c.canhBao.push(`Câu ${c.nhan}: không thấy ý a) b) c) d)`)
    if (c.loai === 'ds' && c.y.length && !c.y.includes('Đ'))
      c.canhBao.push(`Câu ${c.nhan}: chưa đánh dấu ý Đúng — đang tính cả 4 ý Sai`)
    if (c.loai === 'tln' && c.dapSo == null)
      c.canhBao.push(`Câu ${c.nhan}: chưa có đáp số`)
    if (c.canhBao.length) de.canhBao.push(...c.canhBao)
  }
  de.phan = de.phan.filter(p => p.nhom.some(n => n.cau.length))
  if (!de.phan.length) de.loi.push('Không đọc được câu hỏi nào — kiểm tra đề có đánh số “Câu 1.” và phương án “A.” xuống dòng riêng.')
  return de
}
