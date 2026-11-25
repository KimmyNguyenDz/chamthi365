import fs from 'node:fs'
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const sharp = (await import('sharp')).default
const { chamAnh } = await import('../src/lib/omr.ts')

const f = fs.readdirSync('C:/Users/Admin/Desktop').find(x => x.includes('quét 2'))
const d = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync('C:/Users/Admin/Desktop/' + f)), isEvalSupported: false }).promise
const khuon = JSON.parse(fs.readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
const O = pdfjs.OPS

for (let i = 1; i <= d.numPages; i++) {
  const p = await d.getPage(i)
  const ops = await p.getOperatorList()
  let best = null
  for (let j = 0; j < ops.fnArray.length; j++) {
    if (ops.fnArray[j] !== O.paintImageXObject && ops.fnArray[j] !== O.paintInlineImageXObject) continue
    try {
      const img = await new Promise(res => p.objs.get(ops.argsArray[j][0], res))
      if (img && (!best || img.width * img.height > best.width * best.height)) best = img
    } catch {}
  }
  if (!best) { console.log(`trang ${i}: KHONG co anh`); continue }
  // kind 2 = RGB 3 kênh, kind 3 = RGBA 4 kênh
  const ch = best.kind === 3 ? 4 : best.kind === 1 ? 1 : 3
  const { data, info } = await sharp(Buffer.from(best.data.buffer, best.data.byteOffset, best.data.byteLength), {
    raw: { width: best.width, height: best.height, channels: ch }
  }).ensureAlpha().png().toBuffer({ resolveWithObject: false }).then(b =>
    sharp(b).raw().toBuffer({ resolveWithObject: true }))
  await sharp(Buffer.from(best.data.buffer, best.data.byteOffset, best.data.byteLength), {
    raw: { width: best.width, height: best.height, channels: ch }
  }).resize({ width: 700 }).png().toFile(`_research/pdf-trang-${i}.png`)
  try {
    const kq = chamAnh({ d: new Uint8ClampedArray(data), w: info.width, h: info.height }, khuon)
    console.log(`trang ${i}: sbd=${kq.sbd?.s} ma=${kq.ma?.s} moc=${kq.chatLuong.khopMoc} p1=${kq.p1.filter(x => x.chon).length}cau nghi=${kq.nghi.length}`)
  } catch (x) {
    console.log(`trang ${i}: LOI [${x.ma ?? ''}] ${x.message}`)
  }
}
