// Trích ảnh nhúng trong PDF scan → chạy chamAnh
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
  // tìm ảnh lớn nhất trong trang
  let best = null
  for (let j = 0; j < ops.fnArray.length; j++) {
    if (ops.fnArray[j] !== O.paintImageXObject && ops.fnArray[j] !== O.paintInlineImageXObject) continue
    const name = ops.argsArray[j][0]
    try {
      const img = await new Promise(res => {
        p.objs.get(name, res)
      })
      if (img && (!best || img.width * img.height > best.width * best.height)) best = { name, ...img }
    } catch {}
  }
  if (!best) { console.log(`trang ${i}: KHONG co anh nhung`); continue }
  console.log(`trang ${i}: anh ${best.name} ${best.width}x${best.height} kind=${best.kind}`)
  // img.data là raw RGB(A) hoặc jpeg tuỳ kind — lưu ra xem
  fs.writeFileSync(`_research/pdf-trang-${i}.bin`, Buffer.from(best.data.buffer, best.data.byteOffset, best.data.byteLength))
}
