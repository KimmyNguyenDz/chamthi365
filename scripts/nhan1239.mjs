import fs from 'node:fs'
import sharp from 'sharp'
import { nhanDang } from '../src/lib/nhanDang.ts'

const db = {
  ...JSON.parse(fs.readFileSync('public/thu-vien/nhan-dang.json', 'utf8')),
  bin: new Uint8Array(fs.readFileSync('public/thu-vien/nhan-dang.bin')),
}
const { data, info } = await sharp('_research/phieu1239-1.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const kq = nhanDang({ w: info.width, h: info.height, d: new Uint8ClampedArray(data) }, db)
console.log('goiY:', kq.goiY.slice(0, 5).map(g => g.khuon + ':' + g.diem.toFixed(3)).join(' '), '| soKieu:', kq.soKieu, '| ms:', kq.ms.toFixed(0))
