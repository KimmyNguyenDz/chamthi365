// Debug OMR trên ảnh phiếu thật trích từ screenshot — xem ô nào đọc được/lệch
import sharp from 'sharp'
import { chamAnh } from '../src/lib/omr.ts'

const SRC = 'C:/Users/Admin/AppData/Local/Temp/devin-pasted-images/1795572018685428200-3092-22-pasted.png'
const khuon = JSON.parse((await import('fs')).readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))

// crop vùng phiếu trong screenshot (bỏ UI phía trên)
const meta = await sharp(SRC).metadata()
console.log('screenshot:', meta.width, 'x', meta.height)
const crop = { left: 28, top: 195, width: 630, height: 815 }
const { data, info } = await sharp(SRC).extract(crop).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
await sharp(SRC).extract(crop).png().toFile('_research/phieu-crop.png')
console.log('crop:', info.width, 'x', info.height)

const anh = { d: new Uint8ClampedArray(data), w: info.width, h: info.height }
try {
  const kq = chamAnh(anh, khuon)
  console.log('\n=== chatLuong:', JSON.stringify(kq.chatLuong))
  console.log('sbd:', kq.sbd?.s, ' ma:', kq.ma?.s)
  console.log('nghi:', kq.nghi.slice(0, 10))
  // dump độ đậm từng ô SBD + mã đề
  const dump = (cot, ten) => {
    console.log(`\n--- ${ten}`)
    cot.o.forEach((c, j) => {
      console.log(`cot ${j}: ` + c.map(o => `${o.dam.toFixed(2)}${o.tt === 'to' ? '*' : o.tt === 'nghi' ? '~' : o.tt === 'tay' ? '.' : ' '}`).join(' '))
    })
  }
  dump(kq.sbd, 'SBD')
  dump(kq.ma, 'MA DE')
  // vẽ chấm đỏ lên vị trí máy lấy mẫu để kiểm tra lệch
  const px = Buffer.from(data)
  for (const cot of [kq.sbd, kq.ma]) {
    for (const c of cot.o) for (const o of c) {
      // o.x,o.y là tọa độ ảnh gốc — chấm 3x3 đỏ
      const x = Math.round(o.x), y = Math.round(o.y)
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, yy = y + dy
        if (xx < 0 || yy < 0 || xx >= info.width || yy >= info.height) continue
        const i = (yy * info.width + xx) * 4
        px[i] = 255; px[i + 1] = 0; px[i + 2] = 0; px[i + 3] = 255
      }
    }
  }
  await sharp(px, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile('_research/phieu-dbg.png')
  console.log('\noverlay: _research/phieu-dbg.png')
} catch (e) {
  console.log('LOI:', e.message, e.ma ?? '')
}
