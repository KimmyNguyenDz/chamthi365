import fs from 'node:fs'
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const sharp = (await import('sharp')).default
const { chamAnh } = await import('../src/lib/omr.ts')
const f = fs.readdirSync('C:/Users/Admin/Desktop').find(x => x.includes('quét 2'))
const d = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync('C:/Users/Admin/Desktop/' + f)), isEvalSupported: false }).promise
const p = await d.getPage(5)
const ops = await p.getOperatorList()
let best = null
for (let j = 0; j < ops.fnArray.length; j++) {
  if (ops.fnArray[j] !== pdfjs.OPS.paintImageXObject) continue
  try { const img = await new Promise(res => p.objs.get(ops.argsArray[j][0], res)); if (img && (!best || img.width * img.height > best.width * best.height)) best = img } catch {}
}
const rgba = await sharp(Buffer.from(best.data.buffer, best.data.byteOffset, best.data.byteLength), { raw: { width: best.width, height: best.height, channels: best.kind === 3 ? 4 : 3 } }).ensureAlpha().raw().toBuffer()
const khuon = JSON.parse(fs.readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
const kq = chamAnh({ d: new Uint8ClampedArray(rgba), w: best.width, h: best.height }, khuon)
console.log('sbd:', kq.sbd?.s, ' ma:', kq.ma?.s)
kq.sbd.o[6].forEach((o, i) => console.log(`hang ${i}: dam=${o.dam} tt=${o.tt}`))
