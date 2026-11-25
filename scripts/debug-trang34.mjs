import fs from 'node:fs'
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const sharp = (await import('sharp')).default
const { _noi } = await import('../src/lib/omr.ts')

const f = fs.readdirSync('C:/Users/Admin/Desktop').find(x => x.includes('quét 2'))
const d = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync('C:/Users/Admin/Desktop/' + f)), isEvalSupported: false }).promise
const khuon = JSON.parse(fs.readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
const O = pdfjs.OPS

for (const i of [3, 4]) {
  const p = await d.getPage(i)
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
  const e = _noi.xam({ d: new Uint8ClampedArray(rgba), w: best.width, h: best.height })
  const { anh: im, heSo: hs } = _noi.thuNho(e, 2000)
  const s = _noi.chuanNen(im)
  console.log(`\n=== trang ${i} (${im.w}x${im.h})`)
  // quét nhiều ngưỡng
  for (const th of [[105], [135, 160], [90, 120], [150, 180], [110, 140]]) {
    const doms = _noi.gomDom(s, th, true)
    console.log(`nguong ${JSON.stringify(th)}: ${doms.length} dom, canh: ${doms.slice(0, 12).map(dd => dd.canh.toFixed(0)).join(',')}`)
    try {
      const g = _noi.nanPhieu(doms, khuon, [s.w, s.h])
      console.log(`   → khop ${g.khop}/${g.tong}`)
    } catch (x2) { console.log(`   → ${x2.message.slice(0, 40)}`) }
  }
}
