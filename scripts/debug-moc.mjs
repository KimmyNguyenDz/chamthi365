// Debug từng bước nanPhieu: số dom, ứng viên H, khop vs score
import sharp from 'sharp'
import { _noi } from '../src/lib/omr.ts'

const khuon = JSON.parse((await import('fs')).readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
const { data, info } = await sharp('_research/phieu-crop.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })

const e = _noi.xam({ d: new Uint8ClampedArray(data), w: info.width, h: info.height })
const { anh: i, heSo: h } = _noi.thuNho(e, 2000)
const s = _noi.chuanNen(i)
console.log('ảnh thu nhỏ:', i.w, 'x', i.h, 'h=', h.toFixed(3))

for (const m of _noi.NGUONG) {
  const doms = _noi.gomDom(s, m.nguong, m.nenSang)
  console.log(`\nNGUONG ${JSON.stringify(m)} → ${doms.length} dom`)
  if (doms.length < 4) continue
  // score fn giống chamMot
  const hd = [
    ...khuon.sbd.flat(), ...khuon.ma.flat(),
    ...khuon.p1.flatMap(t => t.o), ...khuon.p2.flatMap(t => t.y.flat()),
    ...khuon.p3.flatMap(t => t.c.flatMap(n => n.so)),
  ]
  const st = Math.max(1, Math.floor(hd.length / 90))
  const u = hd.filter((_, n) => n % st === 0)
  const m8 = Array.from({ length: 8 }, (_, n) => 2 * Math.PI * n / 8)
  const R = khuon.rk?.sbd ?? khuon.r
  const x = (t) => {
    let n = 0
    for (const [l, k] of u)
      for (const _ of m8) {
        const N = (Q) => {
          const b = _noi.chieuH(t, l + Q * Math.cos(_), k + Q * Math.sin(_))
          return 1 - _noi.mau(s, b[0], b[1]) / 255
        }
        n += N(R) - .5 * (N(.7 * R) + N(1.4 * R))
      }
    return n / (u.length * 8)
  }
  try {
    const g = _noi.nanPhieu(doms, khuon, [s.w, s.h], x)
    console.log('  → OK khop', g.khop, '/', g.tong, 'tl', g.tl.toFixed(3), 'xoay180', g.xoay180)
  } catch (err) {
    console.log('  → LOI:', err.message)
    // thử không có score
    try {
      const g2 = _noi.nanPhieu(doms, khuon, [s.w, s.h])
      console.log('  → ko-score OK khop', g2.khop, '/', g2.tong)
    } catch (e2) { console.log('  → ko-score cũng lỗi:', e2.message) }
  }
}
