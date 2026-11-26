// Đổi logo thương hiệu: cắt sát mép, đệm vuông, sinh bộ icon PNG
import sharp from 'sharp'

const SRC = 'C:/Users/Admin/AppData/Local/Temp/devin-pasted-images/1795709812907018000-17772-26-pasted.jpg'
const BG = { r: 255, g: 255, b: 255, alpha: 1 }

// trim viền trắng → pad về vuông trên nền trắng
const base = sharp(SRC).trim({ threshold: 12 })
const meta = await base.metadata()
const canh = Math.max(meta.width, meta.height)
const vuong = await base.extend({
  top: Math.floor((canh - meta.height) / 2), bottom: Math.ceil((canh - meta.height) / 2),
  left: Math.floor((canh - meta.width) / 2), right: Math.ceil((canh - meta.width) / 2),
  background: BG,
}).png().toBuffer()

const xuat = async (path, size, scale = 1) => {
  const inner = Math.round(size * scale)
  const img = sharp(vuong).resize(inner, inner, { fit: 'contain', background: BG })
  const buf = scale < 1
    ? await img.extend({
        top: Math.floor((size - inner) / 2), bottom: Math.ceil((size - inner) / 2),
        left: Math.floor((size - inner) / 2), right: Math.ceil((size - inner) / 2),
        background: BG,
      }).png().toBuffer()
    : await img.png().toBuffer()
  await sharp(buf).toFile(path)
  console.log('✓', path, size + 'x' + size)
}

await xuat('public/logo.png', 512)
await xuat('public/icons/icon-192.png', 192)
await xuat('public/icons/icon-512.png', 512)
await xuat('public/icons/icon-512-maskable.png', 512, 0.78) // vùng an toàn maskable ~80%
await xuat('public/icons/apple-touch-icon.png', 180)
