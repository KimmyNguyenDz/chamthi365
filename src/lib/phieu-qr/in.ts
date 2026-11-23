// In phiếu QR ra PDF vector A4 — writer PDF tối thiểu, không dependency
import QRCode from 'qrcode'
import type { Khuon } from '../../types'
import { payloadPhieuQR } from '../qr'

// ---------- writer PDF ----------
type Obj = string
const esc = (s: string) => s.replace(/[\\()]/g, m => '\\' + m)
/** bỏ dấu tiếng Việt — PDF dùng Helvetica WinAnsi */
const ascii = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')

function vietPDF(pages: string[]): Blob {
  const objs: Obj[] = []
  const fontId = 3 + pages.length + 1
  objs.push('<< /Type /Catalog /Pages 2 0 R >>')
  objs.push(`<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i} 0 R`).join(' ')}] /Count ${pages.length} >>`)
  pages.forEach((c, i) => {
    const contentId = fontId + 1 + i
    objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`)
  })
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  pages.forEach(c => {
    const buf = new TextEncoder().encode(c)
    objs.push(`<< /Length ${buf.length} >>\nstream\n${c}\nendstream`)
  })
  let out = '%PDF-1.4\n'
  const xref: number[] = []
  objs.forEach((o, i) => {
    xref.push(new TextEncoder().encode(out).length)
    out += `${i + 1} 0 obj\n${o}\nendobj\n`
  })
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`
  for (const x of xref) out += String(x).padStart(10, '0') + ' 00000 n \n'
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${new TextEncoder().encode(out).length}\n%%EOF`
  return new Blob([out], { type: 'application/pdf' })
}

// ---------- vẽ nội dung ----------
const S = 595 / 1000 // khuôn 1000×1414 → pt
const PY = (y: number) => 842 - y * S
const f = (n: number) => Math.round(n * 100) / 100

function hinhTron(x: number, y: number, r: number): string {
  const k = r * 0.5523, X = x * S, Y = PY(y)
  return `${f(X + r)} ${f(Y)} m ${f(X + r)} ${f(Y + k)} ${f(X + k)} ${f(Y + r)} ${f(X)} ${f(Y + r)} c ` +
    `${f(X - k)} ${f(Y + r)} ${f(X - r)} ${f(Y + k)} ${f(X - r)} ${f(Y)} c ` +
    `${f(X - r)} ${f(Y - k)} ${f(X - k)} ${f(Y - r)} ${f(X)} ${f(Y - r)} c ` +
    `${f(X + k)} ${f(Y - r)} ${f(X + r)} ${f(Y - k)} ${f(X + r)} ${f(Y)} c `
}
const chu = (x: number, y: number, sz: number, s: string) =>
  `BT /F1 ${sz} Tf ${f(x * S)} ${f(PY(y) - sz * .35)} Td (${esc(ascii(s))}) Tj ET`

function veQR(x: number, y: number, canh: number, text: string): string {
  const m = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules
  const n = m.size, cell = (canh * S) / (n + 8) // margin 4 module
  const X = x * S, Y = PY(y + canh)
  let s = `1 1 1 rg ${f(X - 4)} ${f(Y - 4)} ${f(canh * S + 8)} ${f(canh * S + 8)} re f 0 0 0 rg `
  for (let r = 0; r < n; r++)
    for (let q = 0; q < n; q++)
      if (m.get(r, q)) s += `${f(X + (q + 4) * cell)} ${f(Y + (n - r + 4) * cell)} ${f(cell)} ${f(cell)} re `
  return s + 'f'
}

/** Vẽ 1 trang phiếu theo khuôn QR + QR payload cá nhân hoá */
export function veTrang(k: Khuon, p: { ma: string; sbd?: string }, tieuDe = 'PHIEU TRA LOI TRAC NGHIEM'): string {
  const c: string[] = []
  // mốc góc
  c.push('0 0 0 rg')
  for (const [x, y, r] of k.moc) c.push(hinhTron(x, y, r) + 'f')
  // tiêu đề
  c.push(chu(230, 70, 13, tieuDe))
  c.push(chu(230, 92, 8, 'Chamthi365'))
  // QR
  if (k.qr) {
    c.push(veQR(k.qr.x, k.qr.y, k.qr.canh, payloadPhieuQR(p.ma, p.sbd)))
    c.push(chu(k.qr.x, k.qr.y + k.qr.canh + 14, 7, `Ma de: ${p.ma}` + (p.sbd ? ` - SBD: ${p.sbd}` : '')))
  }
  // SBD
  if (k.sbd.length) {
    c.push(chu(k.sbd[0][0][0], k.sbd[0][0][1] - 40, 8, 'SO BAO DANH'))
    k.sbd.forEach(col => col.forEach(([x, y], d) => {
      c.push(chu(x - 3, y - 12, 5, String(d)))
      c.push(hinhTron(x, y, k.r) + 'S')
    }))
  }
  // mã đề (lưới tô dự phòng)
  if (k.ma.length) {
    c.push(chu(k.ma[0][0][0], k.ma[0][0][1] - 40, 8, 'MA DE (du phong)'))
    k.ma.forEach(col => col.forEach(([x, y], d) => {
      c.push(chu(x - 3, y - 12, 5, String(d)))
      c.push(hinhTron(x, y, k.r) + 'S')
    }))
  }
  // P1
  if (k.p1.length) {
    c.push(chu(k.p1[0].o[0][0], k.nhan.p1 - 20, 9, 'PHAN I.'))
    for (const q of k.p1) {
      c.push(chu(q.o[0][0] - 24, q.o[0][1] + 4, 6, String(q.q + 1)))
      q.o.forEach(([x, y], i) => { c.push(chu(x - 3, y - 12, 5, 'ABCD'[i])); c.push(hinhTron(x, y, k.r) + 'S') })
    }
  }
  // P2
  if (k.p2.length) {
    c.push(chu(k.p2[0].y[0][0][0], k.nhan.p2 - 20, 9, 'PHAN II.'))
    for (const q of k.p2) {
      c.push(chu(q.y[0][0][0] - 24, q.y[0][0][1] + 4, 6, String(q.q + 1)))
      q.y.forEach((pair, i) => { c.push(chu(pair[0][0] - 8, pair[0][1] - 12, 5, 'abcd'[i] + ')')); pair.forEach(([x, y], j) => { c.push(chu(x - 3, y - 12, 5, 'ĐS'[j])); c.push(hinhTron(x, y, k.r) + 'S') }) })
    }
  }
  // P3
  if (k.p3.length) {
    c.push(chu(k.p3[0].c[0].so[0][0], k.nhan.p3 - 20, 9, 'PHAN III.'))
    for (const q of k.p3) {
      c.push(chu(q.c[0].so[0][0] - 24, q.c[0].so[0][1] + 4, 6, String(q.q + 1)))
      for (const col of q.c) {
        col.so.forEach(([x, y], d) => { c.push(chu(x - 3, y - 11, 4, String(d))); c.push(hinhTron(x, y, k.r * .8) + 'S') })
        if (col.tru) c.push(hinhTron(col.tru[0], col.tru[1], k.r * .8) + 'S' + chu(col.tru[0] - 3, col.tru[1] - 11, 4, '-'))
        if (col.phay) c.push(hinhTron(col.phay[0], col.phay[1], k.r * .8) + 'S' + chu(col.phay[0] - 3, col.phay[1] - 11, 4, ','))
      }
    }
  }
  return c.join('\n')
}

/** PDF nhiều trang — mỗi phần tử 1 phiếu có QR riêng */
export function renderPhieuPDF(k: Khuon, ds: { ma: string; sbd?: string }[], tieuDe?: string): Blob {
  return vietPDF(ds.map(p => veTrang(k, p, tieuDe)))
}
