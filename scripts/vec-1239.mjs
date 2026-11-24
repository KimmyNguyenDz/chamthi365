// Trích vector từ PDF: tách subpath tại moveTo(13), lấy bounds từng subpath.
import fs from 'node:fs'
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const O = pdfjs.OPS
const d = await pdfjs.getDocument({ url: 'C:/Users/Admin/Desktop/phiếu 1239.pdf', isEvalSupported: false }).promise
const page = await d.getPage(1)
const ops = await page.getOperatorList()

const mul = (m1, m2) => [
  m1[0] * m2[0] + m1[2] * m2[1], m1[1] * m2[0] + m1[3] * m2[1],
  m1[0] * m2[2] + m1[2] * m2[3], m1[1] * m2[2] + m1[3] * m2[3],
  m1[0] * m2[4] + m1[2] * m2[5] + m1[4], m1[1] * m2[4] + m1[3] * m2[5] + m1[5],
]
const xf = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
// số điểm mỗi loại op trong subpath mini-ops
const NPTS = { 11: 2, 12: 2, 13: 2, 14: 6, 15: 4, 16: 4, 17: 2, 18: 0, 19: 4 }

let ctm = [1, 0, 0, 1, 0, 0]
const stack = []
const subs = [] // {codes, x0,x1,y0,y1, cx,cy, fill}
let curFill = null
for (let i = 0; i < ops.fnArray.length; i++) {
  const fn = ops.fnArray[i], a = ops.argsArray[i]
  if (fn === O.save) stack.push([...ctm])
  else if (fn === O.restore) ctm = stack.pop()
  else if (fn === O.transform) ctm = mul(ctm, a)
  else if (fn === O.constructPath) {
    const [codes, pts] = a
    let ci = 0, pi = 0, cur = null
    while (ci < codes.length) {
      const op = codes[ci]
      const n = NPTS[op] ?? 0
      const seg = pts.slice(pi, pi + n)
      pi += n; ci++
      if (op === 13 || cur === null) { // moveTo -> subpath mới
        if (cur) subs.push(cur)
        cur = { codes: [], x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 }
      }
      cur.codes.push(op)
      for (let j = 0; j < seg.length; j += 2) {
        const [px, py] = xf(ctm, seg[j], seg[j + 1])
        if (px < cur.x0) cur.x0 = px; if (px > cur.x1) cur.x1 = px
        if (py < cur.y0) cur.y0 = py; if (py > cur.y1) cur.y1 = py
      }
    }
    if (cur) subs.push(cur)
  }
}
for (const s of subs) { s.w = s.x1 - s.x0; s.h = s.y1 - s.y0; s.cx = (s.x0 + s.x1) / 2; s.cy = (s.y0 + s.y1) / 2 }
console.log('subpaths:', subs.length)
// vòng tròn: 4 curveTo(14), bounds vuông 5-14pt
const circles = subs.filter(s => s.w > 4 && s.w < 14 && Math.abs(s.w - s.h) < 2.5 && s.codes.filter(c => c === 14).length === 4)
console.log('circles:', circles.length)
// ô vuông đặc (mốc): 4 lineTo(12) hoặc rect, fill — bounds vuông 4-20pt
const squares = subs.filter(s => s.w > 4 && s.w < 20 && Math.abs(s.w - s.h) < 2 && s.codes.filter(c => c === 14).length === 0 && s.codes.length <= 6)
console.log('vuong:', squares.length)
fs.writeFileSync('_research/vec-1239.json', JSON.stringify({
  circles: circles.map(c => [+c.cx.toFixed(2), +c.cy.toFixed(2), +c.w.toFixed(2)]),
  squares: squares.map(c => [+c.cx.toFixed(2), +c.cy.toFixed(2), +c.w.toFixed(2), +c.h.toFixed(2)]),
}))
const ys = [...new Set(circles.map(c => Math.round(c.cy)))].sort((a, b) => a - b)
console.log('cy:', ys.join(' '))
