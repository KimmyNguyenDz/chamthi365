import fs from 'node:fs'
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const sharp = (await import('sharp')).default
const { chamAnh } = await import('../src/lib/omr.ts')
const { omrKqToKq } = await import('../src/lib/docKq.ts')

const f = fs.readdirSync('C:/Users/Admin/Desktop').find(x => x.includes('quét 2'))
const d = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync('C:/Users/Admin/Desktop/' + f)), isEvalSupported: false }).promise
const khuon = JSON.parse(fs.readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
console.log('khuon.trang:', khuon.trang)

const p = await d.getPage(1)
const ops = await p.getOperatorList()
let best = null
for (let j = 0; j < ops.fnArray.length; j++) {
  if (ops.fnArray[j] !== pdfjs.OPS.paintImageXObject) continue
  try { const img = await new Promise(res => p.objs.get(ops.argsArray[j][0], res)); if (img && (!best || img.width * img.height > best.width * best.height)) best = img } catch {}
}
const rgba = await sharp(Buffer.from(best.data.buffer, best.data.byteOffset, best.data.byteLength), { raw: { width: best.width, height: best.height, channels: best.kind === 3 ? 4 : 3 } }).ensureAlpha().raw().toBuffer()

const kq = chamAnh({ d: new Uint8ClampedArray(rgba), w: best.width, h: best.height }, khuon)
console.log('sbd:', kq.sbd?.s, 'ma:', kq.ma?.s)
const k = omrKqToKq(kq)
console.log('o total:', k.o.length)
const dem = {}
for (const o of k.o) { const k2 = `${o.phan}${o.to ? '/to' : ''}`; dem[k2] = (dem[k2] ?? 0) + 1 }
console.log(dem)
console.log('p1 q=1 cells:', k.o.filter(o => o.phan === 'p1' && o.q === 1).map(o => `i${o.i} to=${o.to} x=${o.x.toFixed(0)},${o.y.toFixed(0)} r=${o.r}`))
console.log('x range:', Math.min(...k.o.map(o => o.x)), '-', Math.max(...k.o.map(o => o.x)), 'y:', Math.min(...k.o.map(o => o.y)), '-', Math.max(...k.o.map(o => o.y)))

console.log('x:', Math.min(...k.o.map(o => o.x)).toFixed(0), '-', Math.max(...k.o.map(o => o.x)).toFixed(0))
console.log('y:', Math.min(...k.o.map(o => o.y)).toFixed(0), '-', Math.max(...k.o.map(o => o.y)).toFixed(0))
console.log('anh goc:', best.width, 'x', best.height, '— nanAnh ra:', khuon.trang[0] * 2, 'x', khuon.trang[1] * 2)
