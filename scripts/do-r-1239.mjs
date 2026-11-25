// Đo bán kính + offset lưới ô tròn thật trên ảnh phiếu: tối đa hoá "mực ở vòng r − ở 0.7r/1.4r"
import sharp from 'sharp'

const { data, info } = await sharp('_research/phieu-crop.png').greyscale().raw().toBuffer({ resolveWithObject: true })
const W = info.width, ink = (x, y) => 1 - data[Math.round(y) * W + Math.round(x)] / 255

// Tâm ước lượng lưới SBD (đo tay từ ASCII): 8 cột x≈411..481 pitch ~10, 10 hàng
// đo lại tâm: quét vùng, giả sử cột đầu cx0=411, pitch 10.05; hàng '0' y≈108, pitch 14
const CX0 = 411, DX = 10.05, CY0 = 108, DY = 14

// chấm điểm 1 vị trí: ink trên vòng 12 điểm ở r − 0.5*(ink ở .7r + 1.4r)
const V12 = Array.from({ length: 12 }, (_, i) => 2 * Math.PI * i / 12)
function score(cx, cy, r) {
  let s = 0
  for (const a of V12) {
    const at = (f) => ink(cx + f * r * Math.cos(a), cy + f * r * Math.sin(a))
    s += at(1) - .5 * (at(.7) + at(1.4))
  }
  return s
}

// tìm offset (dx,dy) + r tối ưu trên lưới SBD
let best = null
for (let r = 1.4; r <= 3.6; r += .2)
  for (let dx = -4; dx <= 4; dx += .5)
    for (let dy = -3; dy <= 3; dy += .5) {
      let s = 0
      for (let c = 0; c < 8; c++) for (let row = 0; row < 10; row++)
        s += score(CX0 + c * DX + dx, CY0 + row * DY + dy, r)
      if (!best || s > best.s) best = { r: +r.toFixed(1), dx, dy, s }
    }
console.log('best:', best)

// in score theo r ở offset tối ưu để xem đỉnh
for (let r = 1.4; r <= 4.4; r += .2) {
  let s = 0
  for (let c = 0; c < 8; c++) for (let row = 0; row < 10; row++)
    s += score(CX0 + c * DX + best.dx, CY0 + row * DY + best.dy, r)
  console.log(`r=${r.toFixed(1)}  s=${s.toFixed(0)}`)
}
