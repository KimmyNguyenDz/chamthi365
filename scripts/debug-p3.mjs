import fs from 'node:fs'
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const sharp = (await import('sharp')).default
const { chamAnh, nanAnh } = await import('../src/lib/omr.ts')
const { omrKqToKq } = await import('../src/lib/docKq.ts')

const f = fs.readdirSync('C:/Users/Admin/Desktop').find(x => x.includes('quét 2'))
const d = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync('C:/Users/Admin/Desktop/' + f)), isEvalSupported: false }).promise
const khuon = JSON.parse(fs.readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
const O = pdfjs.OPS

const p = await d.getPage(1)
const ops = await p.getOperatorList()
let best = null
for (let j = 0; j < ops.fnArray.length; j++) {
  if (ops.fnArray[j] !== O.paintImageXObject && ops.fnArray[j] !== O.paintInlineImageXObject) continue
  try { const img = await new Promise(res => p.objs.get(ops.argsArray[j][0], res)); if (img && (!best || img.width * img.height > best.width * best.height)) best = img } catch {}
}
const ch = best.kind === 3 ? 4 : best.kind === 1 ? 1 : 3
const { data, info } = await sharp(Buffer.from(best.data.buffer, best.data.byteOffset, best.data.byteLength), { raw: { width: best.width, height: best.height, channels: ch } }).ensureAlpha().png().toBuffer().then(b => sharp(b).raw().toBuffer({ resolveWithObject: true }))

const kq = chamAnh({ d: new Uint8ClampedArray(data), w: info.width, h: info.height }, khuon)
const { o: os, doc } = omrKqToKq(kq)
const nan = nanAnh(new Uint8ClampedArray(data), info.width, info.height, khuon, kq.chieu)
console.log('sbd=', doc.sbd, 'p3=', doc.p3.join('|'))

const TILE = 2, r = (khuon.r ?? 3.4) * 1.7 * TILE
const DO = '#d21f30'
let svg = ''
// tái hiện vietDapAn hiện tại cho câu 1-4
for (let v = 0; v < 4; v++) {
  const cols = khuon.p3[v].c, cuoi = cols[cols.length - 1]
  const yMoc = cols[0].tru?.[1] ?? cols[0].so[0][1]
  const x = (cuoi.so[0][0] + (r / TILE) * 1.4) * TILE
  const y = (yMoc - (r / TILE) * 3.2) * TILE
  console.log(`cau ${v + 1}: text x=${x / TILE} y=${y / TILE}`)
  svg += `<text x="${x}" y="${y}" fill="${DO}" font-size="24" font-weight="800" dominant-baseline="middle">→ 1,0${v}</text>`
  // vẽ khung vùng câu để so sánh
  svg += `<rect x="${cols[0].so[0][0] * TILE - 14}" y="${yMoc * TILE - 20}" width="${(cuoi.so[0][0] - cols[0].so[0][0]) * TILE + 28}" height="${(cols[0].so[9][1] - yMoc) * TILE + 30}" fill="none" stroke="blue" stroke-dasharray="6 4" stroke-width="2"/>`
}
await sharp(Buffer.from(nan.d.buffer, nan.d.byteOffset, nan.d.byteLength), { raw: { width: nan.w, height: nan.h, channels: 4 } })
  .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${nan.w}" height="${nan.h}">${svg}</svg>`) }])
  .png().toFile('_research/debug-p3.png')
console.log('-> _research/debug-p3.png')
