#!/usr/bin/env node
// Mirror thư viện phiếu từ app gốc về public/thu-vien/
// Chạy: node scripts/fetch-thu-vien.mjs [base-url]
import { mkdir, writeFile, access, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const GOC = process.argv[2] || 'https://champhieu.hoc-gioi.pages.dev'
const RA = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'thu-vien')
const SONG_SONG = 8, THU_LAI = 3

const tonTai = async p => { try { await access(p); return true } catch { return false } }

async function tai(url, ra, lan = 0) {
  if (await tonTai(ra)) return 'co'
  try {
    const r = await fetch(url)
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const buf = Buffer.from(await r.arrayBuffer())
    await mkdir(dirname(ra), { recursive: true })
    await writeFile(ra, buf)
    return 'tai'
  } catch (e) {
    if (lan < THU_LAI) { await new Promise(r => setTimeout(r, 500 * (lan + 1))); return tai(url, ra, lan + 1) }
    console.error('LỖI', url, e.message)
    return 'loi'
  }
}

async function chay(viec, ss) {
  const kq = { tai: 0, co: 0, loi: 0 }
  let i = 0
  await Promise.all(Array.from({ length: ss }, async () => {
    while (i < viec.length) {
      const v = viec[i++]
      kq[await v()]++
      if (i % 100 === 0) console.log(`${i}/${viec.length} — tai ${kq.tai} co ${kq.co} loi ${kq.loi}`)
    }
  }))
  return kq
}

const ml = JSON.parse(await (await fetch(`${GOC}/thu-vien/muc-luc.json`)).text())
await mkdir(RA, { recursive: true })
await writeFile(join(RA, 'muc-luc.json'), JSON.stringify(ml))
console.log(`muc-luc: ${ml.phieu.length} mẫu phiếu`)

const viec = []
const ids = new Set()
for (const p of ml.phieu) {
  for (const k of p.khuon) ids.add(k.khuon)
  viec.push(() => tai(`${GOC}/thu-vien/anh/${p.ma}.webp`, join(RA, 'anh', `${p.ma}.webp`)))
  viec.push(() => tai(`${GOC}/thu-vien/phieu/${p.ma}.pdf`, join(RA, 'phieu', `${p.ma}.pdf`)))
}
for (const id of ids)
  viec.push(() => tai(`${GOC}/thu-vien/khuon/${id}.json`, join(RA, 'khuon', `${id}.json`)))

console.log(`cần: ${ids.size} khuôn + ${ml.phieu.length} ảnh + ${ml.phieu.length} pdf`)
const kq = await chay(viec, SONG_SONG)
console.log('xong:', kq)

await writeFile(join(RA, 'THU-VIEN.md'),
  `# Thư viện phiếu\n\nMirror từ ${GOC}/thu-vien/ (tác giả gốc: Thầy Thái Minh Nguyên, app Chấm Phiếu Học Giỏi).\n` +
  `Ngày mirror: ${new Date().toISOString().slice(0, 10)} · ${ml.phieu.length} mẫu · ${ids.size} khuôn\n` +
  `\nNếu phát hành công khai cần xin phép tác giả hoặc thay bằng phiếu tự sinh.\n`)
process.exit(kq.loi ? 1 : 0)
