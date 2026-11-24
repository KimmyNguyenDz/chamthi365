// Thêm fingerprint cv1239a1 vào nhan-dang.json/bin để máy tự nhận mẫu phiếu.
// Chạy: npx vite-node scripts/them-nhan-dang-1239.mjs
import fs from 'node:fs'
import sharp from 'sharp'
import { _noi } from '../src/lib/omr.ts'

const { xam, thuNho, chuanNen, mau, chieuH, homography } = _noi
const KID = 'cv1239a1'
const k = JSON.parse(fs.readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
const DAI = 48
const W = Math.round(DAI * k.trang[0] / k.trang[1])
console.log('fingerprint', W, 'x', DAI)

// 1) render trang PDF -> ảnh -> pipeline chuẩn hoá như lúc nhận dạng
const { data, info } = await sharp('_research/phieu1239-1.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const r = chuanNen(thuNho(xam({ w: info.width, h: info.height, d: new Uint8ClampedArray(data) }), 1024).anh)
console.log('anh chuan hoa:', r.w, 'x', r.h)
// thuNho đổi tỉ lệ: tọa độ khuôn (pt) -> px ảnh chuẩn hoá
const sx = r.w / k.trang[0], sy = r.h / k.trang[1]
const gocPx = k.goc.map(([x, y]) => [x * sx, y * sy])

// 2) homography unit-square -> vùng phiếu trong ảnh
const S = homography([[0, 0], [1, 0], [1, 1], [0, 1]], gocPx)
if (!S) throw new Error('homography fail')
const BUOC = [.25, .5, .75]
const fp = new Uint8Array(W * DAI)
for (let b = 0; b < DAI; b++)
  for (let g = 0; g < W; g++) {
    let C = 0
    for (const T of BUOC) for (const v of BUOC) {
      const G = chieuH(S, (g + v) / W, (b + T) / DAI)
      C += mau(r, G[0], G[1])
    }
    fp[b * W + g] = Math.round(C / 9)
  }

// 3) nối vào bin + json
const bin = fs.readFileSync('public/thu-vien/nhan-dang.bin')
const off = bin.length
fs.writeFileSync('public/thu-vien/nhan-dang.bin', Buffer.concat([bin, Buffer.from(fp)]))
const db = JSON.parse(fs.readFileSync('public/thu-vien/nhan-dang.json', 'utf8'))
db.mau[KID] = [off, W, DAI]
// o: mỗi ô thứ 6 của toàn bộ vị trí ô
const allO = [
  ...k.sbd.flat(), ...k.ma.flat(),
  ...k.p1.flatMap(q => q.o),
  ...k.p2.flatMap(q => q.y.flat()),
  ...k.p3.flatMap(q => q.c.flatMap(c => [...c.so, ...(c.tru ? [c.tru] : []), ...(c.phay ? [c.phay] : [])])),
]
const o = allO.filter((_, i) => i % 6 === 0)
db.nhom.push({
  k: { trang: k.trang, goc: k.goc, moc: k.moc, r: k.r, rk: { p1: k.rk.p1 }, o },
  ks: [KID],
})
fs.writeFileSync('public/thu-vien/nhan-dang.json', JSON.stringify(db))
console.log('them', KID, 'off', off, '| nhom', db.nhom.length, '| mau', Object.keys(db.mau).length, '| o', o.length)
