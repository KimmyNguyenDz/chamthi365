import fs from 'node:fs'
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const sharp = (await import('sharp')).default
const { chamAnh } = await import('../src/lib/omr.ts')

const f = fs.readdirSync('C:/Users/Admin/Desktop').find(x => x.includes('quét 2'))
const d = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync('C:/Users/Admin/Desktop/' + f)), isEvalSupported: false }).promise
const khuon = JSON.parse(fs.readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
const O = pdfjs.OPS
const TRANG = 5

const p = await d.getPage(TRANG)
const ops = await p.getOperatorList()
let best = null
for (let j = 0; j < ops.fnArray.length; j++) {
  if (ops.fnArray[j] !== O.paintImageXObject) continue
  try {
    const img = await new Promise(res => p.objs.get(ops.argsArray[j][0], res))
    if (img && (!best || img.width * img.height > best.width * best.height)) best = img
  } catch {}
}
const ch = best.kind === 3 ? 4 : 3
const rgba = await sharp(Buffer.from(best.data.buffer, best.data.byteOffset, best.data.byteLength), {
  raw: { width: best.width, height: best.height, channels: ch }
}).ensureAlpha().raw().toBuffer()

const kq = chamAnh({ d: new Uint8ClampedArray(rgba), w: best.width, h: best.height }, khuon)
console.log('sbd:', kq.sbd?.s, ' ma:', kq.ma?.s, ' nghi:', kq.nghi.length)
const dump = (cot, ten) => {
  console.log(`\n--- ${ten}`)
  cot.o.forEach((c, j) => {
    console.log(`cot ${j}: ` + c.map((o, i) => `${i}:${o.dam.toFixed(2)}${o.tt === 'to' ? '*' : o.tt === 'nghi' ? '~' : ' '}`).join(' '))
  })
}
dump(kq.sbd, 'SBD')
dump(kq.ma, 'MA DE')
// overlay vị trí lấy mẫu
const px = Buffer.from(rgba)
for (const cot of [kq.sbd, kq.ma]) for (const c of cot.o) for (const o of c) {
  const x = Math.round(o.x), y = Math.round(o.y)
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const xx = x + dx, yy = y + dy
    if (xx < 0 || yy < 0 || xx >= best.width || yy >= best.height) continue
    const i = (yy * best.width + xx) * 4
    px[i] = 255; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = 255
  }
}
await sharp(px, { raw: { width: best.width, height: best.height, channels: 4 } }).resize({ width: 900 }).png().toFile('_research/trang5-dbg.png')
// crop vùng SBD+mã để xem
const sbdO = kq.sbd.o.flat()
const xs = sbdO.map(o => o.x), ys = sbdO.map(o => o.y)
const maO = kq.ma.o.flat()
const bx = Math.min(...xs, ...maO.map(o => o.x)) - 40
const by = Math.min(...ys, ...maO.map(o => o.y)) - 60
const bw = Math.max(...xs, ...maO.map(o => o.x)) - bx + 40
const bh = Math.max(...ys, ...maO.map(o => o.y)) - by + 60
await sharp(Buffer.from(rgba), { raw: { width: best.width, height: best.height, channels: 4 } })
  .extract({ left: Math.max(0, Math.round(bx)), top: Math.max(0, Math.round(by)), width: Math.round(bw), height: Math.round(bh) })
  .png().toFile('_research/trang5-sbd.png')
console.log('crop: _research/trang5-sbd.png', Math.round(bw), 'x', Math.round(bh))
