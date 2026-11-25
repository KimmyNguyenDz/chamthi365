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
  try {
    const img = await new Promise(res => p.objs.get(ops.argsArray[j][0], res))
    if (img && (!best || img.width * img.height > best.width * best.height)) best = img
  } catch {}
}
const ch = best.kind === 3 ? 4 : best.kind === 1 ? 1 : 3
const { data, info } = await sharp(Buffer.from(best.data.buffer, best.data.byteOffset, best.data.byteLength), {
  raw: { width: best.width, height: best.height, channels: ch }
}).ensureAlpha().png().toBuffer().then(b => sharp(b).raw().toBuffer({ resolveWithObject: true }))

const kq = chamAnh({ d: new Uint8ClampedArray(data), w: info.width, h: info.height }, khuon)
const { o: os, doc } = omrKqToKq(kq)
const nan = nanAnh(new Uint8ClampedArray(data), info.width, info.height, khuon, kq.chieu)
console.log(`sbd=${doc.sbd} ma=${doc.ma} o=${os.length} trang=${khuon.trang} nan=${nan.w}x${nan.h}`)
console.log(`o mau: ${JSON.stringify(os.filter(x => x.phan === 'p1' && x.q === 1))}`)

// vẽ vòng lên các ô đã tô + viền mỏng lên mọi ô — kiểm chứng toạ độ khớp ảnh nắn
const TILE = 2
const circles = os.map(x => {
  const R = (x.r ?? 3.4) * TILE * 1.5
  const col = x.to ? '#0a8a3e' : '#88888855'
  return `<circle cx="${(x.x * TILE).toFixed(1)}" cy="${(x.y * TILE).toFixed(1)}" r="${R.toFixed(1)}" fill="none" stroke="${col}" stroke-width="2"/>`
}).join('')
const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${nan.w}" height="${nan.h}">${circles}</svg>`)
await sharp(Buffer.from(nan.d.buffer, nan.d.byteOffset, nan.d.byteLength), { raw: { width: nan.w, height: nan.h, channels: 4 } })
  .composite([{ input: svg }]).png().toFile('_research/verify-tick.png')
console.log('-> _research/verify-tick.png')
