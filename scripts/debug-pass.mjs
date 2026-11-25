import sharp from 'sharp'
import { _noi } from '../src/lib/omr.ts'
const khuon = JSON.parse((await import('fs')).readFileSync('public/thu-vien/khuon/cv1239a1.json', 'utf8'))
const { data, info } = await sharp('_research/phieu-crop.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const e = _noi.xam({ d: new Uint8ClampedArray(data), w: info.width, h: info.height })
const { anh: i, heSo: h } = _noi.thuNho(e, 2000)
const s = _noi.chuanNen(i)
for (const m of _noi.NGUONG) {
  try {
    const kq = _noi.chamMot(i, s, h, khuon, _noi.gomDom(s, m.nguong, m.nenSang))
    console.log(`PASS ${JSON.stringify(m)} → sbd=${kq.sbd?.s} ma=${kq.ma?.s} moc=${kq.chatLuong.khopMoc}/${kq.chatLuong.tongMoc} nguong=${kq.chatLuong.nguong}`)
  } catch (x) { console.log(`PASS ${JSON.stringify(m)} → LOI ${x.ma ?? ''} ${x.message}`) }
}
