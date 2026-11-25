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
console.log(`sbd=${doc.sbd} ma=${doc.ma} p1=${doc.p1.join('')} p3=${doc.p3.join('|')}`)

// mô phỏng veChua: tick theo vị trí khuôn — P1, P2, P3
const TILE = 2, r = (khuon.r ?? 3.4) * 1.7 * TILE
const XANH = '#0a8a3e', DO = '#d21f30'
const tickV = (x, y) => `<path d="M${x - r * .72} ${y + r * .05} L${x - r * .18} ${y + r * .6} L${x + r * .8} ${y - r * .62}" stroke="${XANH}" stroke-width="${r * .34}" fill="none" stroke-linecap="round"/>`
const tickX = (x, y) => `<path d="M${x - r * .6} ${y - r * .6} L${x + r * .6} ${y + r * .6} M${x + r * .6} ${y - r * .6} L${x - r * .6} ${y + r * .6}" stroke="${DO}" stroke-width="${r * .3}" fill="none" stroke-linecap="round"/>`

let svg = ''
// giả định: câu 1-3 đúng (✓ ô đã tô theo doc), câu 4 sai 'C'→'B'
const daGia = ['A', 'B', 'C', 'B']
doc.p1.slice(0, 4).forEach((g, v) => {
  const dung = v < 3
  for (const chr of g) { const [x, y] = khuon.p1[v].o['ABCDEFGH'.indexOf(chr)]; svg += (dung ? tickV : tickX)(x * TILE, y * TILE) }
  if (!dung) { const [x, y] = khuon.p1[v].o['ABCDEFGH'.indexOf(daGia[v])]; svg += tickV(x * TILE, y * TILE) }
})
// P2 câu 1: ý a Đ đúng, ý b S sai→Đ
for (const [y, chon, dung, dungDa] of [[0, 'Đ', true, 'Đ'], [1, 'S', false, 'Đ']]) {
  if (chon === 'Đ' || chon === 'ĐS') { const [x, yy] = khuon.p2[0].y[y][0]; svg += (dung ? tickV : tickX)(x * TILE, yy * TILE) }
  if (chon === 'S' || chon === 'ĐS') { const [x, yy] = khuon.p2[0].y[y][1]; svg += (dung ? tickV : tickX)(x * TILE, yy * TILE) }
  if (!dung) { const [x, yy] = khuon.p2[0].y[y][dungDa === 'Đ' ? 0 : 1]; svg += tickV(x * TILE, yy * TILE) }
}
// P3: câu 1 sai → '→ 0,25' cạnh câu; câu 2 đúng → ✓ các ô tô
const cols = khuon.p3[0].c
const cuoi = cols[cols.length - 1]
const yMoc = cols[0].tru?.[1] ?? cols[0].so[0][1]
svg += `<text x="${(cuoi.so[0][0] + r / TILE * 2.4) * TILE}" y="${(yMoc - r / TILE * 3.2) * TILE}" fill="${DO}" font-size="24" font-weight="800" dominant-baseline="middle">→ 0,25</text>`
for (const o of os.filter(x => x.phan === 'p3' && x.q === 2 && x.to)) svg += tickV(o.x * TILE, o.y * TILE)

await sharp(Buffer.from(nan.d.buffer, nan.d.byteOffset, nan.d.byteLength), { raw: { width: nan.w, height: nan.h, channels: 4 } })
  .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${nan.w}" height="${nan.h}">${svg}</svg>`) }])
  .png().toFile('_research/verify-tick2.png')
console.log('-> _research/verify-tick2.png')
