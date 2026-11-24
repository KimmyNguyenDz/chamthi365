// Phát hiện tâm vòng tròn nhỏ (đk ~8px) trên phieu1239-1.png
import fs from 'node:fs'
import { PNG } from 'pngjs'

const p = PNG.sync.read(fs.readFileSync('_research/phieu1239-1.png'))
const W = p.width, H = p.height
const dark = (x, y) => { const j = (y * W + x) * 4; return (p.data[j] * 299 + p.data[j + 1] * 587 + p.data[j + 2] * 114) / 1000 < 175 }

// vành r≈4px (8 điểm), tâm phải sáng
const RING = []
for (let a = 0; a < 14; a++) { const t = a / 14 * 2 * Math.PI; RING.push([Math.round(Math.cos(t) * 7), Math.round(Math.sin(t) * 7)]) }
const score = (x, y) => {
  if (dark(x, y) || dark(x - 1, y) || dark(x + 1, y) || dark(x, y - 1) || dark(x, y + 1)) return 0
  let d = 0
  for (const [dx, dy] of RING) if (dark(x + dx, y + dy)) d++
  return d
}

const cand = []
for (let y = 30; y < H - 30; y += 2) for (let x = 30; x < W - 30; x += 2) {
  const s = score(x, y)
  if (s >= 8) cand.push([x, y, s])
}
cand.sort((a, b) => b[2] - a[2])
const keep = []
for (const c of cand) {
  if (keep.every(k => (k[0] - c[0]) ** 2 + (k[1] - c[1]) ** 2 > 30)) keep.push(c)
}
console.log('vong tron:', keep.length)
fs.writeFileSync('_research/vong-1239.json', JSON.stringify(keep.map(k => [+(k[0] / 2).toFixed(1), +(k[1] / 2).toFixed(1)])))
