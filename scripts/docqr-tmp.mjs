import sharp from 'sharp'
import jsQR from 'jsqr'
const p = 'C:/Users/Admin/AppData/Local/Temp/devin-pasted-images/1795571061155320300-3092-21-pasted.jpg'
const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const q = jsQR(new Uint8ClampedArray(data), info.width, info.height)
console.log(q ? q.data.slice(0, 500) : 'KHONG DOC DUOC')
if (q) console.log('\n---len', q.data.length)
