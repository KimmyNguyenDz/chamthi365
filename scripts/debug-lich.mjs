import sharp from 'sharp'
import { _noi } from '../src/lib/omr.ts'
const khuon = JSON.parse((await import('fs')).readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
const { data, info } = await sharp('_research/phieu-crop.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const e = _noi.xam({ d: new Uint8ClampedArray(data), w: info.width, h: info.height })
const { anh: i, heSo: h } = _noi.thuNho(e, 2000)
const s = _noi.chuanNen(i)
const doms = _noi.gomDom(s, [135, 160], true)
const g = _noi.nanPhieu(doms, khuon, [s.w, s.h])
console.log('khop', g.khop, '/', g.tong, 'tl', g.tl.toFixed(3))
// chiếu hàng '0' (row index theo khuôn sbd[c][r]) của các cột SBD
// khuôn sbd: [8 cột][10 hàng] — in ra y của hàng 0
console.log('sbd[0]:', JSON.stringify(khuon.sbd[0]))
console.log('sbd[0][0] goc khuon:', JSON.stringify(khuon.sbd[0][0]))
for (let c = 0; c < 8; c++) {
  const [x, y] = g.chieu(khuon.sbd[c][0][0], khuon.sbd[c][0][1])
  console.log(`cot ${c}: khuon (${khuon.sbd[c][0][0]},${khuon.sbd[c][0][1]}) → anh (${x.toFixed(1)},${y.toFixed(1)})`)
}
