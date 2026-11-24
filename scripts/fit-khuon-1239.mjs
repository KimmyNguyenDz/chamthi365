// Fit khuôn 52d461e4 sang phiếu CV1239 Letter bằng ICP trên các vòng tròn đã detect.
import fs from 'node:fs'
const k = JSON.parse(fs.readFileSync('public/thu-vien/khuon/52d461e4.json', 'utf8'))
const nho = JSON.parse(fs.readFileSync('_research/vong-1239.json', 'utf8'))   // r~8px (sbd/ma)
const lon = JSON.parse(fs.readFileSync('_research/vong-lon-1239.json', 'utf8')) // r~10px (p1/p2/p3)
const det = [...nho, ...lon] // pt coords

// affine ban đầu từ 4 góc
const KG = k.goc, UG = [[58, 46.5], [553.8, 46.5], [553.8, 745.5], [58, 745.5]]
let ax = (UG[1][0] - UG[0][0]) / (KG[1][0] - KG[0][0]), bx = UG[0][0] - ax * KG[0][0]
let ay = (UG[3][1] - KG[0][1]) / (KG[3][1] - KG[0][1]), by = UG[0][1] - ay * KG[0][1]

const pts = []
const add = (p, tag) => pts.push({ p, tag })
k.sbd.forEach(c => c.forEach(p => add(p, 'sbd')))
k.ma.forEach(c => c.forEach(p => add(p, 'ma')))
k.p1.forEach(q => q.o.forEach(p => add(p, 'p1')))
k.p2.forEach(q => q.y.forEach(r => r.forEach(p => add(p, 'p2'))))
k.p3.forEach(q => q.c.forEach(c => { c.so.forEach(p => add(p, 'p3')); if (c.tru) add(c.tru, 'p3'); if (c.phay) add(c.phay, 'p3') }))
;(k.khac || []).forEach(g => g[1] && g[1].forEach(c => c.forEach(p => add(p, 'khac'))))

const T = ([x, y]) => [ax * x + bx, ay * y + by]
const near = ([x, y]) => {
  let bd = 1e9, bp = null
  for (const d of det) { const dd = (d[0] - x) ** 2 + (d[1] - y) ** 2; if (dd < bd) { bd = dd; bp = d } }
  return bd < 36 ? bp : null // trong 6pt
}
for (let it = 0; it < 8; it++) {
  const pr = []
  for (const { p, tag } of pts) { const tp = T(p); const m = near(tp); if (m) pr.push([p, m, tag]) }
  // least squares từng trục
  let sx = 0, sxx = 0, sxp = 0, sy = 0, syy = 0, syp = 0, n = pr.length
  for (const [p, m] of pr) { sx += p[0]; sxx += p[0] * p[0]; sxp += p[0] * m[0]; sy += p[1]; syy += p[1] * p[1]; syp += p[1] * m[1] }
  ax = (n * sxp - sx * pr.reduce((s, [, m]) => s + m[0], 0)) / (n * sxx - sx * sx)
  bx = (pr.reduce((s, [, m]) => s + m[0], 0) - ax * sx) / n
  ay = (n * syp - sy * pr.reduce((s, [, m]) => s + m[1], 0)) / (n * syy - sy * sy)
  by = (pr.reduce((s, [, m]) => s + m[1], 0) - ay * sy) / n
  console.log(`it${it}: khop ${pr.length}/${pts.length} ax=${ax.toFixed(4)} bx=${bx.toFixed(1)} ay=${ay.toFixed(4)} by=${by.toFixed(1)}`)
}
// báo lệch còn lại
const stat = {}
for (const { p, tag } of pts) {
  const tp = T(p); const m = near(tp)
  stat[tag] = stat[tag] || [0, 0]
  stat[tag][1]++; if (m && ((m[0] - tp[0]) ** 2 + (m[1] - tp[1]) ** 2) < 4) stat[tag][0]++
}
console.log('khop <2pt:', stat)
fs.writeFileSync('_research/fit-1239.json', JSON.stringify({ ax, bx, ay, by }))
