import { describe, expect, test } from 'vitest'
import JSZip from 'jszip'
import { docDocx } from './docx-doc'
import { parseDe } from './parse'
import { tronDe } from './tron'
import { vietDocx, vietDapAnDocx } from './write'

const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'
const P = (inner: string) => `<w:p>${inner}</w:p>`
const T = (txt: string, rPr = '') => `<w:r>${rPr}<w:t xml:space="preserve">${txt}</w:t></w:r>`
const U = '<w:rPr><w:u w:val="single"/></w:rPr>'
const DO = '<w:rPr><w:color w:val="FF0000"/></w:rPr>'

/** dựng docx tối thiểu */
async function docx(body: string): Promise<ArrayBuffer> {
  const z = new JSZip()
  z.file('word/document.xml', `<?xml version="1.0"?><w:document ${NS}><w:body>${body}<w:sectPr/></w:body></w:document>`)
  z.file('[Content_Types].xml', `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`)
  z.file('_rels/.rels', `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`)
  return z.generateAsync({ type: 'arraybuffer' })
}

const pa = (chu: string, nd: string, dung = false, gim = false) =>
  P(T(`${gim ? '*' : ''}${chu}. `, dung ? U : '') + T(nd))

const body =
  P(T('ĐỀ KIỂM TRA TOÁN')) + P(T('Mã đề: gốc')) +
  P(T('PHẦN I. Trắc nghiệm')) +
  P(T('Câu 1. Tính 1+1?')) + pa('A', '1') + pa('B', '2', true) + pa('C', '3') + pa('D', '4') +
  P(T('Câu 2. Tính 2+2?')) + pa('A', '3') + pa('B', '5') + pa('C', '4', true) + pa('D', '6') +
  P(T('Câu 3. Tính 3+3?')) + pa('A', '6', true) + pa('B', '7') + pa('C', '8') + pa('D', '9') +
  P(T('Câu 4. Tính 4+4?')) + P(T('*A. 7')) + pa('B', '8', true) + pa('C', '9') + pa('D', '10') +
  P(T('PHẦN II. Đúng/Sai')) +
  P(T('Câu 1. Xét các mệnh đề:')) +
  P(T('a) ', U) + T('Mệnh đề 1')) + P(T('b) Mệnh đề 2')) + P(T('c) ', DO) + T('Mệnh đề 3')) + P(T('d) Mệnh đề 4')) +
  P(T('PHẦN III. Trả lời ngắn')) +
  P(T('Câu 1. Tính x?')) + P(T('Đáp số: 0,25'))

describe('parseDe', () => {
  test('đọc 4 câu tn + 1 ds + 1 tln, đáp án theo gạch chân/đỏ, ghim *', async () => {
    const de = parseDe(await docDocx(await docx(body)))
    expect(de.loi).toEqual([])
    const tn = de.phan.find(p => p.so === 1)!
    const ds = de.phan.find(p => p.so === 2)!
    const tln = de.phan.find(p => p.so === 3)!
    expect(tn.nhom.flatMap(n => n.cau)).toHaveLength(4)
    const [c1, , , c4] = tn.nhom.flatMap(n => n.cau)
    expect(c1.pa.find(x => x.dung)?.chu).toBe('B')
    expect(c4.pa[0].gim).toBe(true)
    const cd = ds.nhom.flatMap(n => n.cau)[0]
    expect(cd.y).toEqual(['Đ', 'S', 'Đ', 'S'])
    const ct = tln.nhom.flatMap(n => n.cau)[0]
    expect(ct.dapSo).toBe('0,25')
  })
  test('cảnh báo khi thiếu đánh dấu đáp án', async () => {
    const x = P(T('PHẦN I.')) + P(T('Câu 1. Hỏi?')) + pa('A', '1') + pa('B', '2')
    const de = parseDe(await docDocx(await docx(x)))
    expect(de.canhBao.join()).toContain('chưa đánh dấu đáp án đúng')
  })
  test('báo lỗi đúng chuỗi khi không phải docx', async () => {
    const z = new JSZip(); z.file('a.txt', 'x')
    await expect(docDocx(await z.generateAsync({ type: 'arraybuffer' }))).rejects.toThrow('không đọc .doc')
  })
})

describe('tronDe', () => {
  test('4 mã: đáp án map đúng, ghim *A giữ vị trí đầu, cân ABCD ±1', async () => {
    const de = parseDe(await docDocx(await docx(body)))
    const { des, dapAn } = tronDe(de, { soDe: 4, maList: ['101', '102', '103', '104'], canABCD: true, tronYP2: false, tronLoai: false })
    expect(dapAn).toHaveLength(4)
    for (const [i, d] of des.entries()) {
      const da = dapAn[i]
      expect(da.ma).toBe(['101', '102', '103', '104'][i])
      expect(da.p1).toHaveLength(4)
      expect(da.p2).toHaveLength(1)
      expect(da.p3).toEqual(['0,25'])
      // câu ghim *A. luôn ở vị trí đầu và vẫn là 'A'
      const c4 = d.phan[0].nhom.flatMap(n => n.cau).find(c => c.pa.some(p => p.gim))!
      expect(c4.pa[0].gim).toBe(true)
      expect(c4.pa[0].chu).toBe('A')
      // đáp án của câu 4 phải là vị trí của pa dung
      const idx = d.phan[0].nhom.flatMap(n => n.cau).indexOf(c4)
      expect(da.p1[idx]).toBe(c4.pa.find(x => x.dung)!.chu)
      // mọi chữ đúng hợp lệ
      for (const c of da.p1) expect('ABCD').toContain(c)
    }
    // cân ABCD: mỗi mã lệch ≤1
    for (const d of des) {
      const dem: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
      for (const n of d.phan[0].nhom) for (const c of n.cau) {
        const p = c.pa.find(x => x.dung)
        if (p) dem[p.chu]++
      }
      expect(Math.max(...Object.values(dem)) - Math.min(...Object.values(dem))).toBeLessThanOrEqual(1)
    }
  })
})

describe('vietDocx', () => {
  test('ghi lại đủ câu, mã đề trong document, mở đọc được', async () => {
    const goc = await docDocx(await docx(body))
    const de = parseDe(goc)
    const { des, dapAn } = tronDe(de, { soDe: 1, maList: ['101'], canABCD: false, tronYP2: false, tronLoai: false })
    const bytes = await vietDocx(des[0], goc, { maDe: '101', chanTrang: true })
    const goc2 = await docDocx(bytes.buffer.slice(0) as ArrayBuffer)
    const de2 = parseDe(goc2)
    expect(de2.phan.flatMap(p => p.nhom.flatMap(n => n.cau))).toHaveLength(6)
    expect(goc2.documentXml).toContain('Mã đề: 101')
    const foot = await goc2.zip.file('word/footer1.xml')!.async('string')
    expect(foot).toContain('Mã đề 101')
    expect(foot).toContain('PAGE')
  })
  test('vietDapAnDocx xuất bảng đáp án đọc lại được', async () => {
    const b = await vietDapAnDocx([{ ma: '101', da: { p1: ['A', 'B'], p2: ['ĐSĐS'], p3: ['0,25'] } }])
    const goc = await docDocx(b.buffer.slice(0) as ArrayBuffer)
    expect(goc.documentXml).toContain('BẢNG ĐÁP ÁN')
    expect(goc.documentXml).toContain('Mã 101')
  })
})
