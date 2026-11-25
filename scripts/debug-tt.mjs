import sharp from 'sharp'
import { _noi } from '../src/lib/omr.ts'
const khuon = JSON.parse((await import('fs')).readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
const { data, info } = await sharp('_research/phieu-crop.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const e = _noi.xam({ d: new Uint8ClampedArray(data), w: info.width, h: info.height })
const { anh: i, heSo: h } = _noi.thuNho(e, 2000)
const s = _noi.chuanNen(i)
const kq = _noi.chamMot(i, s, h, khuon, _noi.gomDom(s, [135, 160], true))
// histogram tt + dam cho các ô KHÔNG được tô (câu 13-40 p1 — trống)
const oTrong = kq.p1.slice(12).flatMap(p => p.o)
const oTo = kq.p1.slice(0, 12).flatMap(p => p.o)
const stat = (ds, ten) => {
  const t = {}; ds.forEach(o => t[o.tt] = (t[o.tt] || 0) + 1)
  console.log(ten, JSON.stringify(t), 'damTru max:', Math.max(...ds.map(o => o.dam)).toFixed(3))
}
stat(oTrong, 'ô câu 13-40 (trống):')
stat(oTo, 'ô câu 1-12 (có tô):')
// trong các ô trống bị 'nghi': xem dam/vien/sang
const nghiO = oTrong.filter(o => o.tt !== 'trong')
console.log('ô trống bị flag:', nghiO.length)
console.log(nghiO.slice(0, 10).map(o => `dam=${o.dam} vien=${o.vien} sang=${o.sang} tt=${o.tt}`).join('\n'))
