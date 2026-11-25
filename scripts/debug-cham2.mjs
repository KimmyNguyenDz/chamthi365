import fs from 'node:fs'
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const sharp = (await import('sharp')).default
const { chamAnh, nanAnh } = await import('../src/lib/omr.ts')
const { omrKqToKq } = await import('../src/lib/docKq.ts')
const { dsCham } = await import('../src/lib/chiTiet.ts')

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

// đáp án giả + điểm giả (so trực tiếp để có cả đúng lẫn sai)
const da = {
  ma: doc.ma, p1: doc.p1.map((g, v) => 'ABCD'[v % 4]), p2: doc.p2.map(() => 'ĐSĐS'),
  p3: doc.p3.map((g, v) => `${(v * 3 + 1) % 10},${(v * 7 + 2) % 10}${v % 2 ? '5' : '0'}`),
}
const diem = {
  p1: doc.p1.map((g, v) => ({ dung: g === da.p1[v], diem: g === da.p1[v] ? .25 : 0 })),
  p2: doc.p2.map((g, v) => ({ y: [0, 1, 2, 3].map(i => g[i] === da.p2[v][i]), diem: 0 })),
  p3: doc.p3.map((g, v) => ({ dung: g === da.p3[v], diem: 0 })),
  phan: { p1: 7.25, p2: 3, p3: 1, tuLuan: 0 }, tong: 11.25, coDapAn: true,
}
const nets = dsCham(os, khuon, doc, da, diem)
console.log('nets:', nets.length, 'chu:', nets.filter(n => n.k === 'chu').map(n => `${n.txt}@${n.x.toFixed(0)},${n.y.toFixed(0)}`))

const T = 2, XANH = '#0a8a3e', DO = '#d21f30'
let svg = ''
for (const n of nets) {
  if (n.k === 'cham') svg += `<circle cx="${n.x * T}" cy="${n.y * T}" r="${n.r * .62 * T}" fill="${n.dung ? XANH : DO}" fill-opacity=".85"/>`
  else if (n.k === 'vong') svg += `<circle cx="${n.x * T}" cy="${n.y * T}" r="${n.r * .75 * T}" fill="none" stroke="${XANH}" stroke-width="${n.r * .28 * T}"/>`
  else svg += `<text x="${n.x * T}" y="${n.y * T}" fill="${DO}" font-size="${n.r * 2.2 * T}" font-weight="800" text-anchor="${n.neo === 'giua' ? 'middle' : n.neo === 'phai' ? 'end' : 'start'}" dominant-baseline="middle">${n.txt}</text>`
}
await sharp(Buffer.from(nan.d.buffer, nan.d.byteOffset, nan.d.byteLength), { raw: { width: nan.w, height: nan.h, channels: 4 } })
  .composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${nan.w}" height="${nan.h}">${svg}</svg>`) }])
  .png().toFile('_research/debug-cham2.png')
console.log('-> _research/debug-cham2.png')
