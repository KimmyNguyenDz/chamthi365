// Dựng khuôn cho phiếu CV1239 bản 1-trang Letter từ render PNG.
// Dùng khuôn 52d461e4 làm bản gốc, affine-map toàn bộ tọa độ sang khổ mới.
import fs from 'node:fs'
import { PNG } from 'pngjs'

const SCALE = 2 // render ở 2x → chia để ra pt
const png = PNG.sync.read(fs.readFileSync('_research/phieu1239-1.png'))
const W = png.width, H = png.height
const g = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) {
  const j = i * 4
  g[i] = (png.data[j] * 299 + png.data[j + 1] * 587 + png.data[j + 2] * 114) / 1000
}

// Connected components trên pixel tối
const dark = (i) => g[i] < 140
const seen = new Uint8Array(W * H)
const blobs = []
for (let i = 0; i < W * H; i++) {
  if (!dark(i) || seen[i]) continue
  let minx = W, maxx = 0, miny = H, maxy = 0, n = 0
  const st = [i]; seen[i] = 1
  while (st.length) {
    const p = st.pop(); n++
    const x = p % W, y = (p / W) | 0
    if (x < minx) minx = x; if (x > maxx) maxx = x
    if (y < miny) miny = y; if (y > maxy) maxy = y
    for (const q of [p - 1, p + 1, p - W, p + W]) {
      if (q < 0 || q >= W * H || seen[q] || !dark(q)) continue
      const qx = q % W
      if (Math.abs(qx - x) > 1) continue // tránh wrap dòng
      seen[q] = 1; st.push(q)
    }
  }
  blobs.push({ x: (minx + maxx) / 2, y: (miny + maxy) / 2, w: maxx - minx + 1, h: maxy - miny + 1, n })
}

// Mốc = ô vuông đặc, kích thước vừa
const moc = blobs.filter(b => b.w >= 25 && b.w <= 70 && Math.abs(b.w - b.h) <= 6 && b.n / (b.w * b.h) > 0.6)
console.log('blob:', blobs.length, '| moc ứng viên:', moc.length)
moc.sort((a, b) => a.x - b.x || a.y - b.y)
console.log(moc.map(m => `[${(m.x / SCALE).toFixed(1)},${(m.y / SCALE).toFixed(1)} ${m.w}x${m.h} fill=${(m.n / (m.w * m.h)).toFixed(2)}]`).join('\n'))
fs.writeFileSync('_research/blob-1239.json', JSON.stringify(blobs.map(b => [b.x / SCALE, b.y / SCALE, b.w / SCALE, b.h / SCALE, b.n])))
