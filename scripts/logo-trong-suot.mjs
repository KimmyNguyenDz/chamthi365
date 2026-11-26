// Bỏ nền trắng của logo → PNG trong suốt (flood-fill từ mép, giữ trắng bên trong)
import sharp from 'sharp'

const SRC = 'C:/Users/Admin/AppData/Local/Temp/devin-pasted-images/1795709812907018000-17772-26-pasted.jpg'
const { data, info } = await sharp(SRC).trim({ threshold: 12 }).ensureAlpha()
  .raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, N = W * H
const px = i => i * 4
const trang = i => data[px(i)] > 240 && data[px(i)+1] > 240 && data[px(i)+2] > 240

// BFS từ mép qua các pixel trắng
const tham = new Uint8Array(N)
const q = []
for (let x = 0; x < W; x++) { q.push(x, (H-1)*W + x) }
for (let y = 0; y < H; y++) { q.push(y*W, y*W + W-1) }
while (q.length) {
  const i = q.pop()
  if (tham[i] || !trang(i)) continue
  tham[i] = 1
  const x = i % W, y = (i / W) | 0
  if (x > 0) q.push(i-1); if (x < W-1) q.push(i+1)
  if (y > 0) q.push(i-W); if (y < H-1) q.push(i+W)
}

// pixel nền → alpha 0; pixel sát mép nền → lông mềm
for (let i = 0; i < N; i++) {
  if (tham[i]) { data[px(i)+3] = 0; continue }
  const x = i % W, y = (i / W) | 0
  let sat = false
  for (let dy = -1; dy <= 1 && !sat; dy++) for (let dx = -1; dx <= 1 && !sat; dx++) {
    const nx = x+dx, ny = y+dy
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue
    if (tham[ny*W+nx]) sat = true
  }
  if (sat) {
    const lum = (data[px(i)] + data[px(i)+1] + data[px(i)+2]) / 3
    if (lum > 225) data[px(i)+3] = Math.max(40, Math.round(255 * (255 - lum) / 30))
  }
}

await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toFile('public/logo.png')
console.log('✓ public/logo.png trong suốt', W + 'x' + H)
