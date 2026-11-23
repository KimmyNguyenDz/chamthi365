// Đọc .docx → mô hình đoạn/run giữ định dạng (gạch chân, màu, tab, bảng, ảnh, OMML)
import JSZip from 'jszip'
import { docXml, timEls, layText, type XmlEl } from './xml'

export type Run = { txt: string; u: boolean; do_: boolean; b: boolean; tab: boolean }
export type Doan = {
  el: XmlEl                 // node w:p (hoặc w:tbl) trong cây document
  runs: Run[]
  txt: string               // toàn bộ text đoạn
  tbl?: string[][]          // nếu là bảng: text từng ô
  hinh: boolean             // có ảnh/drawing
  omml: boolean             // có công thức OMML
}

export type DocGoc = {
  zip: JSZip
  body: XmlEl[]             // danh sách phần tử con của w:body (w:p / w:tbl / w:sectPr)
  doan: Doan[]              // chỉ w:p & w:tbl theo thứ tự
  documentXml: string
  sectPr: string            // xml của sectPr (khổ giấy, lề) — gắn lại cuối body
  headerXml?: string
  footerXml?: string
}

const giaiMo = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

function doanTu(el: XmlEl): Doan {
  if (el.ten === 'w:tbl') {
    const rows = timEls(el, 'w:tr').map(tr => timEls(tr, 'w:tc').map(tc => timEls(tc, 'w:t').map(t => giaiMo(layText(t))).join('')))
    return { el, runs: [], txt: rows.map(r => r.join('\t')).join('\n'), tbl: rows, hinh: !!timEls(el, 'w:drawing').length, omml: !!timEls(el, 'm:oMath').length }
  }
  const runs: Run[] = []
  for (const r of timEls(el, 'w:r')) {
    const rPr = timEls(r, 'w:rPr')[0]
    const u = !!rPr && !!timEls(rPr, 'w:u').find(x => x.attrs['w:val'] !== 'none')
    const color = rPr ? (timEls(rPr, 'w:color')[0]?.attrs['w:val'] ?? '') : ''
    const do_ = /^(ff0000|ed1c24|c00000|e74c3c|ff3300)$/i.test(color.replace('#', ''))
    const b = !!rPr && !!timEls(rPr, 'w:b').length
    const tab = !!timEls(r, 'w:tab').length
    const txt = timEls(r, 'w:t').map(t => giaiMo(layText(t))).join('')
    if (txt || tab) runs.push({ txt, u, do_, b, tab })
  }
  const txt = runs.map(r => r.txt + (r.tab ? '\t' : '')).join('')
  return { el, runs, txt, hinh: !!timEls(el, 'w:drawing').length, omml: !!timEls(el, 'm:oMath').length }
}

export async function docDocx(buf: ArrayBuffer): Promise<DocGoc> {
  const zip = await JSZip.loadAsync(buf)
  const f = zip.file('word/document.xml')
  if (!f) throw new Error('Tệp không phải .docx (thiếu word/document.xml). Lưu ý app chỉ đọc .docx, không đọc .doc — mở bằng Word rồi Save As .docx.')
  const documentXml = await f.async('string')
  const cay = docXml(documentXml)
  const docEl = cay.find(e => e.ten === 'w:document')!
  const bodyEl = docEl.con.find(c => 't' in c ? false : c.ten === 'w:body') as XmlEl | undefined
  if (!bodyEl) throw new Error('Tệp .docx không có nội dung (thiếu w:body)')
  const body = bodyEl.con.filter((c): c is XmlEl => !('t' in c))
  const doan = body.filter(c => c.ten === 'w:p' || c.ten === 'w:tbl').map(doanTu)
  const sect = body.find(c => c.ten === 'w:sectPr')
  const head = zip.file('word/header1.xml') ?? zip.file('word/header2.xml')
  const foot = zip.file('word/footer1.xml') ?? zip.file('word/footer2.xml')
  return {
    zip, body, doan, documentXml,
    sectPr: sect ? '<w:sectPr>' + sect.con.map(c => 't' in c ? '' : '').join('') + '</w:sectPr>' : '',
    headerXml: head ? await head.async('string') : undefined,
    footerXml: foot ? await foot.async('string') : undefined,
  }
}
