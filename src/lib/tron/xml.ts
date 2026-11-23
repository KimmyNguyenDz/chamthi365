// XML tokenizer tối thiểu cho document.xml của docx — chạy được node & browser
export type XmlEl = {
  ten: string            // 'w:p', 'w:t'…
  attrs: Record<string, string>
  con: (XmlEl | { t: 'text'; v: string })[]
  raw: string            // xml gốc để ghi lại nguyên vẹn
}

/** Parse 1 chuỗi xml thành cây el (bỏ qua PI/comment/CDATA bọc text) */
export function docXml(xml: string): XmlEl[] {
  const stack: XmlEl[] = []
  const goc: XmlEl = { ten: '#root', attrs: {}, con: [], raw: '' }
  let cur = goc
  const re = /<[^>]+>|[^<]+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const tok = m[0]
    if (tok.startsWith('<?') || tok.startsWith('<!--') || tok.startsWith('<!')) continue
    if (tok[0] === '<' && tok[1] === '/') { cur = stack.pop()!; continue }
    if (tok[0] === '<') {
      const dong = tok.endsWith('/>')
      const ten = tok.match(/^<([\w:.-]+)/)![1]
      const attrs: Record<string, string> = {}
      for (const a of tok.matchAll(/([\w:.-]+)\s*=\s*"([^"]*)"/g)) attrs[a[1]] = a[2]
      const el: XmlEl = { ten, attrs, con: [], raw: '' }
      cur.con.push(el)
      if (!dong) { stack.push(cur); cur = el }
      continue
    }
    cur.con.push({ t: 'text', v: tok })
  }
  return goc.con as XmlEl[]
}

/** Serialize cây el (text đã escape) */
export function ghiXml(el: XmlEl | { t: 'text'; v: string }): string {
  if ('t' in el) return el.v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const at = Object.entries(el.attrs).map(([k, v]) => ` ${k}="${v.replace(/"/g, '&quot;')}"`).join('')
  if (!el.con.length) return `<${el.ten}${at}/>`
  return `<${el.ten}${at}>${el.con.map(ghiXml).join('')}</${el.ten}>`
}

export const ghiText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Lấy toàn bộ text của el (mọi w:t con) */
export function layText(el: XmlEl | { t: 'text'; v: string }): string {
  if ('t' in el) return el.v
  return el.con.map(layText).join('')
}

/** Tìm el con đầu tiên theo tên (đệ quy) */
export function timEl(el: XmlEl, ten: string): XmlEl | null {
  for (const c of el.con) {
    if ('t' in c) continue
    if (c.ten === ten) return c
    const t = timEl(c, ten)
    if (t) return t
  }
  return null
}

export const timEls = (el: XmlEl, ten: string, acc: XmlEl[] = []): XmlEl[] => {
  for (const c of el.con) {
    if ('t' in c) continue
    if (c.ten === ten) acc.push(c)
    timEls(c, ten, acc)
  }
  return acc
}
