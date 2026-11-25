import sharp from 'sharp'
import { _noi } from '../src/lib/omr.ts'
const khuon = JSON.parse((await import('fs')).readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
const { data, info } = await sharp('_research/p2-crop.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const e = _noi.xam({ d: new Uint8ClampedArray(data), w: info.width, h: info.height })
const { anh: i, heSo: h } = _noi.thuNho(e, 2000)
const s = _noi.chuanNen(i)
const kq = _noi.chamMot(i, s, h, khuon, _noi.gomDom(s, [135, 160], true))
console.log(`sbd=${kq.sbd?.s} ma=${kq.ma?.s} moc=${kq.chatLuong.khopMoc} nghi=${kq.nghi.length} ${JSON.stringify(kq.nghi)}`)
kq.sbd.o.forEach((c, j) => {
  console.log(`sbd cot ${j}: ` + c.map(o => `${o.dam.toFixed(2)}${o.tt === 'to' ? '*' : o.tt === 'nghi' ? '~' : o.tt === 'tay' ? '.' : ' '}`).join(' '))
})
kq.ma.o.forEach((c, j) => {
  console.log(`ma cot ${j}: ` + c.map(o => `${o.dam.toFixed(2)}${o.tt === 'to' ? '*' : o.tt === 'nghi' ? '~' : o.tt === 'tay' ? '.' : ' '}`).join(' '))
})
console.log('p1:', kq.p1.map(p => `${p.q}:${p.chon || '·'}${p.nghi ? '~' : ''}`).join(' '))
console.log('p3:', kq.p3.map(p => `${p.q}:${p.s || '·'}${p.nghi ? '~' : ''}`).join(' '))
