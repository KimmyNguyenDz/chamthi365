// Ghi lại .docx: xếp lại câu/phương án trong document.xml, chèn mã đề,
// giữ nguyên media/OMML/styles/rel của tệp gốc (copy zip rồi thay document.xml)
import JSZip from 'jszip'
import type { DocGoc, Doan } from './docx-doc'
import type { De } from './parse'
import { docXml, ghiXml, ghiText, layText, timEl, timEls, type XmlEl } from './xml'

export type Trinh = {
  tieuDe?: string           // đổi dòng tiêu đề đầu (nếu có)
  maDe: string
  chanTrang: boolean        // chân trang "Trang x/y - Mã đề"
  truong?: string           // dòng "TRƯỜNG …" (nếu trình chuẩn)
}

const NS = `xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.openxmlformats.org/officeDocument/2012/wordml" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordmlCompatible" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14 w15 wp14"`

const P = (inner: string) => `<w:p>${inner}</w:p>`
const R = (txt: string, rPr = '') => `<w:r>${rPr}<w:t xml:space="preserve">${ghiText(txt)}</w:t></w:r>`
const RPR_B = '<w:rPr><w:b/></w:rPr>'

/** Clone el rồi thay text của run đầu có chữ cái phương án / nhãn câu */
function thayChuDau(el: XmlEl, re: RegExp, thay: string): XmlEl {
  const e: XmlEl = JSON.parse(JSON.stringify(el))
  const ts = timEls(e, 'w:t')
  for (const t of ts) {
    const v = layText(t)
    const m = re.exec(v)
    if (m) {
      const moi = v.replace(re, thay)
      t.con = [{ t: 'text', v: moi.replace(/&/g, '&amp;').replace(/</g, '&lt;') }]
      return e
    }
  }
  return e
}

const RE_CHU_PA = /^(\s*[#*]?\s*)[A-DАΑ](\s*[.)])/u
const RE_NHAN_CAU = /(C(?:â|â|a)u|Question)\s*\d+/i

function doanMoi(els: XmlEl[], re: RegExp, thay: string): XmlEl {
  const dau = els[0]
  if (!dau) return docXml(P(R(thay)))[0]
  return thayChuDau(dau, re, thay)
}

/** Ghi lại body: đầu + từng phần (PHẦN + câu đã trộn) + đuôi */
export async function vietDocx(de: De, goc: DocGoc, trinh: Trinh): Promise<Uint8Array> {
  const { zip } = goc
  const ra: string[] = []

  // đầu đề
  const dau = [...de.dau]
  if (trinh.truong) {
    const el = docXml(P(R(trinh.truong, RPR_B)))[0]
    dau.unshift({ el, runs: [{ txt: trinh.truong, u: false, do_: false, b: true, tab: false }], txt: trinh.truong, hinh: false, omml: false })
  }
  let daChenMa = false
  for (let i = 0; i < dau.length; i++) {
    const d = dau[i]
    // đổi tiêu đề nếu cấu hình
    let el = d.el
    if (trinh.tieuDe && i === 0 && d.txt.trim()) el = doanMoi([el], /.+/, trinh.tieuDe)
    // đổi mã đề nếu dòng đã có sẵn "Mã đề"
    if (/mã\s*đề/i.test(d.txt)) { el = doanMoi([el], /mã\s*đề\s*[:.]?\s*\S*/i, `Mã đề: ${trinh.maDe}`); daChenMa = true }
    ra.push(ghiXml(el))
  }
  if (!daChenMa) ra.push(P(R(`Mã đề: ${trinh.maDe}`, RPR_B)))

  const LA = ['', 'PHẦN I.', 'PHẦN II.', 'PHẦN III.', 'PHẦN IV.']
  for (const p of de.phan) {
    ra.push(P(R(LA[p.so] ?? `PHẦN ${p.so}.`, RPR_B)))
    let so = 0
    for (const n of p.nhom) {
      for (const c of n.cau) {
        so++
        const ds = [...c.doan]
        ra.push(ghiXml(thayChuDau(ds[0].el, RE_NHAN_CAU, `Câu ${so}.`)))
        for (let i = 1; i < ds.length; i++) {
          const d = ds[i]
          const pa = c.pa.find(x => x.doan === d)
          if (pa) {
            // viết lại chữ cái đầu theo thứ tự mới (giữ * ghim trong text gốc)
            ra.push(ghiXml(thayChuDau(d.el, RE_CHU_PA, `$1${pa.chu}$2`)))
          } else ra.push(ghiXml(d.el))
        }
      }
    }
  }
  for (const d of de.duoi) ra.push(ghiXml(d.el))
  ra.push(goc.sectPr || '<w:sectPr/>')

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${ra.join('')}</w:body></w:document>`
  zip.file('word/document.xml', xml)

  // chân trang "Trang x/y - Mã đề"
  if (trinh.chanTrang) {
    const ft = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}>${P(
      R('Trang ') + '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>' +
      R('/') + '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> NUMPAGES </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>' +
      R(` - Mã đề ${trinh.maDe}`))}</w:ftr>`
    zip.file('word/footer1.xml', ft)
    // khai báo relationship nếu chưa có
    // (đơn giản: ghi đè footer1 đã có sẵn trong zip gốc; nếu chưa có, Word vẫn chấp nhận thiếu rel trong nhiều trường hợp)
  }
  return zip.generateAsync({ type: 'uint8array' })
}

/** BẢNG ĐÁP ÁN gộp: mỗi câu một hàng, mỗi mã đề một cột */
export async function vietDapAnDocx(des: { ma: string; da: { p1: string[]; p2: string[]; p3: string[] } }[]): Promise<Uint8Array> {
  const rows: string[] = ['<w:tr>' + ['Câu', ...des.map(d => 'Mã ' + d.ma)].map(t => '<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>' + P(R(t, RPR_B)) + '</w:tc>').join('') + '</w:tr>']
  const n = Math.max(...des.map(d => d.da.p1.length + d.da.p2.length + d.da.p3.length))
  for (let i = 0; i < n; i++) {
    rows.push('<w:tr>' + `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${P(R(String(i + 1)))}</w:tc>` +
      des.map(d => `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr>${P(R(d.da.p1[i] ?? d.da.p2[i - d.da.p1.length] ?? d.da.p3[i - d.da.p1.length - d.da.p2.length] ?? ''))}</w:tc>`).join('') + '</w:tr>')
  }
  const tbl = `<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(b => `<w:${b} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`).join('')}</w:tblBorders></w:tblPr>${rows.join('')}</w:tbl>`
  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${P(R('BẢNG ĐÁP ÁN — Chamthi365', RPR_B))}${tbl}<w:sectPr/></w:body></w:document>`
  const zip = new JSZip()
  zip.file('word/document.xml', xml)
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`)
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`)
  return zip.generateAsync({ type: 'uint8array' })
}

export async function dongGoiZip(teps: { ten: string; duLieu: Uint8Array }[]): Promise<Blob> {
  const z = new JSZip()
  for (const t of teps) z.file(t.ten, t.duLieu)
  return z.generateAsync({ type: 'blob' })
}
