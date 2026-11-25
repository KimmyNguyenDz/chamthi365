// Render 5 trang PDF scan + chạy chamAnh từng trang
import fs from 'node:fs'
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const { createCanvas } = await import('@napi-rs/canvas')
const { chamAnh } = await import('../src/lib/omr.ts')

const f = fs.readdirSync('C:/Users/Admin/Desktop').find(x => x.includes('quét 2'))
const d = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync('C:/Users/Admin/Desktop/' + f)), isEvalSupported: false }).promise
const khuon = JSON.parse(fs.readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))

for (let i = 1; i <= d.numPages; i++) {
  const p = await d.getPage(i)
  const v = p.getViewport({ scale: 1 })
  const cv = createCanvas(Math.ceil(v.width), Math.ceil(v.height))
  await p.render({ canvasContext: cv.getContext('2d'), viewport: v }).promise
  fs.writeFileSync(`_research/pdf-trang-${i}.png`, cv.toBuffer('image/png'))
  const im = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height)
  try {
    const kq = chamAnh({ d: im.data, w: im.width, h: im.height }, khuon)
    console.log(`trang ${i}: sbd=${kq.sbd?.s} ma=${kq.ma?.s} moc=${kq.chatLuong.khopMoc}/${kq.chatLuong.tongMoc} p1=${kq.p1.filter(x=>x.chon).length}cau nghi=${kq.nghi.length}`)
  } catch (x) {
    console.log(`trang ${i}: LOI [${x.ma ?? ''}] ${x.message}`)
  }
}
