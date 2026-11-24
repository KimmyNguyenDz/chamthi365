// Sinh khuôn cv1239a1 cho phiếu CV1239 Letter 1 trang — tọa độ trích từ vector PDF.
// y trong file này = toạ độ top-down (792 - y_pdf).
import fs from 'node:fs'

const F = 792
const sq = JSON.parse(fs.readFileSync('_research/vec-1239.json', 'utf8')).squares
const clus=(arr,tol)=>{arr=[...arr].sort((a,b)=>a-b);const out=[];for(const x of arr){const c=out[out.length-1];if(c&&x-c.m<tol){c.s+=x;c.n++;c.m=c.s/c.n}else out.push({s:x,n:1,m:x})}return out.map(c=>c.m)}

const sbdX = [413.3, 423.0, 433.0, 443.0, 452.8, 462.8, 472.6, 482.6]
const maX = [516.2, 526.2, 536.0, 546.0]
const smY = clus(sq.filter(s => s[1] > 550 && s[1] < 690).map(s => F - s[1]), 4)
const p1X = [87.3, 113.2, 139.1, 165.0, 211.3, 237.2, 263.1, 288.9, 335.4, 361.1, 387.0, 412.9, 459.3, 485.1, 511.0, 536.9]
const p1Y = clus(sq.filter(s => s[1] > 380 && s[1] < 495).map(s => F - s[1]), 4)
const p2Y = clus(sq.filter(s => s[1] > 270 && s[1] < 320).map(s => F - s[1]), 4)
const p3X = [87.3, 170.0, 252.7, 335.4, 418.0, 500.6]
const p3DX = [0, 12.1, 24.2, 36.3]
const truY = 792 - 202.8, phayY = 792 - 190.7
const p3Y = clus(sq.filter(s => s[1] < 185).map(s => F - s[1]), 4)

const K = {
  trang: [612, 792], r: 4.2,
  goc: [[58.1, 46.8], [554, 46.8], [554, 745.8], [58.1, 745.8]],
  moc: [
    [58.1, 46.8, 12.7], [554, 46.8, 12.7], [58.1, 745.8, 12.7], [554, 745.8, 12.7],
    [398.3, 91.8, 7.2], [502.1, 91.8, 7.2], [398.3, 252.6, 7.2], [502.1, 252.6, 7.2],
    [58, 265.5, 7.2], [182.1, 265.5, 7.2], [306.1, 265.5, 7.2], [554, 265.4, 7.2],
    [58, 430.7, 7.2], [182.1, 430.7, 7.2], [306.1, 430.7, 7.2], [430, 430.7, 7.2], [554, 430.7, 7.2],
    [58, 534.9, 7.2], [140.6, 534.9, 7.2], [182.1, 534.9, 7.2], [223.3, 534.9, 7.2],
    [306.1, 534.9, 7.2], [388.7, 534.9, 7.2], [430, 534.9, 7.2], [471.4, 534.9, 7.2], [554, 534.9, 7.2],
    [140.6, 745.8, 7.2], [223.3, 745.8, 7.2], [306.1, 745.8, 7.2], [388.7, 745.8, 7.2], [471.4, 745.8, 7.2],
  ],
  sbd: sbdX.map(x => smY.map(y => [x, +y.toFixed(1)])),
  ma: maX.map(x => smY.map(y => [x, +y.toFixed(1)])),
  khac: [],
  p1: [], p2: [], p3: [],
  nhan: { p1: 40, p2: 8, p3: 6 }, nhan_khop: true, thieu: [], la: 0,
  rk: { sbd: 4.2, ma: 4.2, khac: 4.2, p1: 4.2, p2: 4.2, p3: 4.2 },
  o_bi_che: 10, clip: null, id: 'cv1239a1', nguon: 'vector',
}
for (let b = 0; b < 4; b++) for (let q = 0; q < 10; q++)
  K.p1.push({ q: b * 10 + q + 1, o: p1X.slice(b * 4, b * 4 + 4).map(x => [x, +p1Y[q].toFixed(1)]) })
for (let c = 0; c < 8; c++)
  K.p2.push({ q: c + 1, y: p2Y.map(y => [[p1X[c * 2], +y.toFixed(1)], [p1X[c * 2 + 1], +y.toFixed(1)]]) })
for (let c = 0; c < 6; c++) {
  K.p3.push({
    q: c + 1,
    c: p3DX.map((dx, ci) => {
      const x = +(p3X[c] + dx).toFixed(1)
      const col = { so: p3Y.map(y => [x, +y.toFixed(1)]) }
      if (ci === 0) col.tru = [x, +truY.toFixed(1)]
      if (ci === 1 || ci === 2) col.phay = [x, +phayY.toFixed(1)]
      return col
    }),
  })
}
K.tong_o = K.sbd.flat().length + K.ma.flat().length + K.p1.reduce((s, q) => s + q.o.length, 0)
  + K.p2.reduce((s, q) => s + q.y.flat().length, 0)
  + K.p3.reduce((s, q) => s + q.c.reduce((t, c) => t + c.so.length + (c.tru ? 1 : 0) + (c.phay ? 1 : 0), 0), 0)
fs.writeFileSync('public/thu-vien/khuon/cv1239a1.json', JSON.stringify(K))
console.log('tong_o:', K.tong_o, '| sbd', K.sbd.length, 'x', K.sbd[0].length,
  '| p1', K.p1.length, '| p2', K.p2.length, '| p3', K.p3.length,
  '| smY', smY.length, 'p1Y', p1Y.length, 'p2Y', p2Y.length, 'p3Y', p3Y.length)
