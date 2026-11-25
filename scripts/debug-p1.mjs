import sharp from 'sharp'
import { _noi } from '../src/lib/omr.ts'
const khuon = JSON.parse((await import('fs')).readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
const { data, info } = await sharp('_research/phieu-crop.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const e = _noi.xam({ d: new Uint8ClampedArray(data), w: info.width, h: info.height })
const { anh: i, heSo: h } = _noi.thuNho(e, 2000)
const s = _noi.chuanNen(i)
const kq = _noi.chamMot(i, s, h, khuon, _noi.gomDom(s, [135, 160], true))
console.log('sbd', kq.sbd.s, 'ma', kq.ma.s)
console.log('p1:', kq.p1.map(p => `${p.q}:${p.chon || '·'}${p.nghi ? '~' : ''}`).join(' '))
console.log('p2:', kq.p2.map(p => `${p.q}:${p.y.join('') || '·'}`).join(' '))
console.log('p3:', kq.p3.map(p => `${p.q}:${p.s || '·'}${p.nghi ? '~' : ''}`).join(' '))
// đếm ô 'to' vs 'nghi' vs dam max từng phần
const stat = (ds) => {
  const tt = {}
  ds.flat(9).forEach(o => { if (o) tt[o.tt] = (tt[o.tt] || 0) + 1 })
  return JSON.stringify(tt)
}
console.log('p1 tt:', stat(kq.p1.map(p => p.o)))
console.log('p3 tt:', stat(kq.p3.flatMap(p => p.o.map(c => [...c.so, c.tru, c.phay].filter(Boolean)))))
console.log('nghi:', kq.nghi.length, JSON.stringify(kq.nghi.slice(0,15)))
console.log('chatLuong:', JSON.stringify(kq.chatLuong))
