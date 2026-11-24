// Snap lưới giả thuyết vào vòng tròn thật trên ảnh bằng sector-coverage.
// Xuất khuôn hoàn chỉnh -> public/thu-vien/khuon/cv1239lt.json
import fs from 'node:fs'
import { PNG } from 'pngjs'
const p = PNG.sync.read(fs.readFileSync('_research/phieu1239-1.png'))
const W = p.width, H = p.height
const g = (x, y) => { const j = (y * W + x) * 4; return (p.data[j] * 299 + p.data[j + 1] * 587 + p.data[j + 2] * 114) / 1000 }
const AN = []
for (let dy = -13; dy <= 13; dy++) for (let dx = -13; dx <= 13; dx++) {
  const r = Math.hypot(dx, dy)
  if (r >= 4 && r <= 11) AN.push([dx, dy, Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 12) % 12])
}
const IN = []
for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) if (Math.hypot(dx, dy) < 4) IN.push([dx, dy])
const sc = (x, y) => {
  const sec = new Set()
  for (const [dx, dy, s] of AN) if (g(x + dx, y + dy) < 175) sec.add(s)
  let c = 0
  for (const [dx, dy] of IN) if (g(x + dx, y + dy) < 175) c++
  return c / IN.length < 0.25 ? sec.size : 0
}
// snap: quét lân cận ±R pt, trả tâm tốt nhất (px->pt)
const snap = (xpt, ypt, R = 9) => {
  let bs = 0, bx = xpt * 2, by = ypt * 2
  for (let dy = -R * 2; dy <= R * 2; dy++) for (let dx = -R * 2; dx <= R * 2; dx++) {
    const s = sc(bx0(bx + dx), by0(by + dy))
    if (s > bs) { bs = s; bx += dx; by += dy }
  }
  return bs >= 8 ? [+(bx / 2).toFixed(2), +(by / 2).toFixed(2)] : null
}
const bx0 = Math.round, by0 = Math.round

const seq = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1))
// --- lưới giả thuyết (pt) ---
const SBD_X = seq(413, 482, 8), SBD_Y = seq(109, 235, 10)
const MA_X = seq(516, 546, 4)
const P1_X = [87, 113, 139, 165, 211, 237, 263, 289, 335, 361, 387, 413, 459, 485, 511, 537]
const P1_Y = seq(299, 409, 10)
const P2_Y = seq(480, 520, 4)
const P3_QX = [87, 171, 253, 336, 418, 501] // cột đầu mỗi câu
const P3_CX = [0, 10, 21, 31]             // offset 4 cột ký tự trong câu
const P3_TRU = 571.6, P3_PHAY = 588.5, P3_Y = seq(603, 723, 10)

const K = {
  trang: [612, 792], r: 5, goc: [[58, 46.5], [553.8, 46.5], [553.8, 745.5], [58, 745.5]],
  moc: [
    [58, 46.5, 7], [553.8, 46.5, 7],
    [398, 91.5, 4], [501.8, 91.5, 4], [398, 252.3, 4], [501.8, 252.3, 4],
    [57.8, 265.3, 4], [181.8, 265.3, 4], [305.8, 265.3, 4], [553.8, 265.3, 4],
    [57.8, 430.3, 4], [181.8, 430.3, 4], [305.8, 430.3, 4], [429.8, 430.3, 4], [553.8, 430.3, 4],
    [57.8, 534.8, 4], [140.3, 534.8, 4], [181.8, 534.8, 4], [223.3, 534.8, 4], [305.8, 534.8, 4],
    [388.3, 534.8, 4], [429.8, 534.8, 4], [471.3, 534.8, 4], [553.8, 534.8, 4],
    [58, 745.5, 7], [140.3, 745.5, 4], [223, 745.5, 4], [305.8, 745.5, 4], [388.5, 745.5, 4],
    [471.3, 745.5, 4], [553.8, 745.5, 7],
  ],
  sbd: [], ma: [], khac: [], p1: [], p2: [], p3: [],
  rk: { sbd: 4.5, ma: 4.5, khac: 5, p1: 5, p2: 5, p3: 4.5 },
  nhan: { p1: 40, p2: 8, p3: 6 }, nhan_khop: true, thieu: [], la: 0,
  clip: null, id: 'cv1239lt', nguon: 'vector', o_bi_che: 0, tong_o: 0,
}

let miss = 0, tot = 0
const S = (x, y, tag) => { tot++; const m = snap(x, y); if (!m) { miss++; console.log('MISS', tag, x, y) } return m || [x, y] }

K.sbd = SBD_X.map(x => SBD_Y.map(y => S(x, y, 'sbd')))
K.ma = MA_X.map(x => SBD_Y.map(y => S(x, y, 'ma')))
for (let b = 0; b < 4; b++) for (let q = 0; q < 10; q++)
  K.p1.push({ q: b * 10 + q + 1, o: P1_X.slice(b * 4, b * 4 + 4).map(x => S(x, P1_Y[q], 'p1')) })
K.p1.sort((a, b) => a.q - b.q)
for (let c = 0; c < 8; c++)
  K.p2.push({ q: c + 1, y: P2_Y.map(y => [S(P1_X[c * 2], y, 'p2'), S(P1_X[c * 2 + 1], y, 'p2')]) })
for (let c = 0; c < 6; c++) {
  const cols = P3_CX.map((dx, ci) => {
    const x = P3_QX[c] + dx
    const c_ = { so: P3_Y.map(y => S(x, y, 'p3')) }
    if (ci === 0) c_.tru = S(x, P3_TRU, 'p3')
    if (ci === 1 || ci === 2) c_.phay = S(x, P3_PHAY, 'p3')
    return c_
  })
  K.p3.push({ q: c + 1, c: cols })
}
K.tong_o = tot
console.log('miss', miss, '/', tot)
fs.writeFileSync('public/thu-vien/khuon/cv1239lt.json', JSON.stringify(K))
console.log('saved public/thu-vien/khuon/cv1239lt.json')
