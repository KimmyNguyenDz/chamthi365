import { describe, expect, test } from 'vitest'
import jsQR from 'jsqr'
import QRCode from 'qrcode'
import { PNG } from 'pngjs'
import { docPayloadDapAn, docPayloadPhieu, docQRVung, ghepDapAn, payloadDapAn, payloadPhieuQR, sinhQR } from './qr'
import type { DapAn } from '../types'
import { khuonTest, render } from './omr.test'
import { xuLyTin } from '../workers/may-cham.core'

describe('payload phiếu QR', () => {
  test('round-trip ma + sbd', () => {
    expect(docPayloadPhieu(payloadPhieuQR('0101', '10010201'))).toEqual({ ma: '0101', sbd: '10010201' })
    expect(docPayloadPhieu(payloadPhieuQR('0102'))).toEqual({ ma: '0102', sbd: undefined })
    expect(docPayloadPhieu('https://x.y')).toBeNull()
    expect(docPayloadPhieu('CT365:notjson')).toBeNull()
  })
})

describe('payload đáp án chia phần', () => {
  const dapAn: DapAn[] = Array.from({ length: 8 }, (_, i) => ({
    ma: `010${i}`,
    p1: Array.from({ length: 40 }, () => 'ABCD'[i % 4]),
    p2: Array.from({ length: 8 }, () => 'ĐSĐS'),
    p3: Array.from({ length: 6 }, () => '0,25'),
  }))
  const bai = { diem: { soCau: { p1: 40, p2: 8, p3: 6 } }, dapAn } as never

  test('mỗi phần ≤1400 ký tự, ghep đủ trả về nguyên dapAn', () => {
    const parts = payloadDapAn(bai)
    expect(parts.length).toBeGreaterThan(1)
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(1400)
    const map = new Map<number, ReturnType<typeof docPayloadDapAn> extends never ? never : NonNullable<ReturnType<typeof docPayloadDapAn>>['goi']>()
    for (const p of parts) {
      const d = docPayloadDapAn(p)!
      expect(d.n).toBe(parts.length)
      map.set(d.i, d.goi)
    }
    const ghep = ghepDapAn(map)!
    expect(ghep.soCau).toEqual({ p1: 40, p2: 8, p3: 6 })
    expect(ghep.dapAn).toHaveLength(8)
    expect(ghep.dapAn[0].ma).toBe('0100')
  })

  test('thiếu phần → null', () => {
    const parts = payloadDapAn(bai)
    const map = new Map<number, never>()
    const d0 = docPayloadDapAn(parts[0])!
    if (parts.length > 1) {
      map.set(d0.i, d0.goi as never)
      expect(ghepDapAn(map as never)).toBeNull()
    }
  })
})

describe('sinhQR', () => {
  test('render PNG rồi jsQR đọc lại đúng payload', async () => {
    const text = payloadPhieuQR('0101', '10010201')
    const url = await sinhQR(text)
    const b64 = url.split(',')[1]
    const png = PNG.sync.read(Buffer.from(b64, 'base64'))
    const kq = jsQR(new Uint8ClampedArray(png.data.buffer as ArrayBuffer), png.width, png.height)
    expect(kq?.data).toBe(text)
    expect(docPayloadPhieu(kq!.data)).toEqual({ ma: '0101', sbd: '10010201' })
  })
})

/** Vẽ QR vào ảnh render (tọa độ khuôn → pixel) */
function veQRvao(a: { w: number; h: number; d: Uint8ClampedArray }, box: { x: number; y: number; canh: number }, scale: number, text: string) {
  const m = QRCode.create(text, { errorCorrectionLevel: 'M' }).modules
  const n = m.size, cell = (box.canh * scale) / (n + 8)
  for (let r = 0; r < n + 8; r++)
    for (let c = 0; c < n + 8; c++) {
      const den = r >= 4 && r < n + 4 && c >= 4 && c < n + 4 && m.get(r - 4, c - 4)
      const x0 = Math.round(box.x * scale + c * cell), y0 = Math.round(box.y * scale + r * cell)
      for (let y = y0; y < y0 + Math.ceil(cell); y++)
        for (let x = x0; x < x0 + Math.ceil(cell); x++) {
          if (x < 0 || y < 0 || x >= a.w || y >= a.h) continue
          const o = (y * a.w + x) * 4, v = den ? 0 : 255
          a.d[o] = a.d[o + 1] = a.d[o + 2] = v; a.d[o + 3] = 255
        }
    }
}

describe('QR trong worker chấm', () => {
  test('khuôn có qr → doc.ma/sbd từ QR, maNguon=qr', async () => {
    const k = { ...khuonTest(), qr: { x: 190, y: 230, canh: 90 } }
    const a = render(k, 4, new Set(['sbd:0:5', 'ma:0:1', 'p1:0:3']))
    veQRvao(a, k.qr!, 4, payloadPhieuQR('77', '88'))
    const r = await xuLyTin({ id: 'x', w: a.w, h: a.h, buf: a.d.buffer as ArrayBuffer, khuon: k, luu: false })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.doc.ma).toBe('77')
      expect(r.doc.sbd).toBe('88')
      expect(r.doc.maNguon).toBe('qr')
      expect(r.doc.sbdNguon).toBe('qr')
    }
  })

  test('QR mờ/không đọc được → fallback ô tô + cờ cần xem', async () => {
    const k = { ...khuonTest(), qr: { x: 190, y: 230, canh: 90 } }
    const a = render(k, 4, new Set(['sbd:0:5', 'sbd:1:2', 'ma:0:1', 'p1:0:3']))
    // vùng QR để trống — không đọc được
    const r = await xuLyTin({ id: 'x', w: a.w, h: a.h, buf: a.d.buffer as ArrayBuffer, khuon: k, luu: false })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.doc.ma).toBe('1') // ô tô
      expect(r.doc.sbd).toBe('52')
    }
  })

  test('docQRVung đọc trực tiếp vùng cắt', () => {
    const box = { x: 20, y: 30, canh: 80 }
    const a = { w: 300, h: 300, d: new Uint8ClampedArray(300 * 300 * 4).fill(255) }
    veQRvao(a, box, 2, payloadPhieuQR('09'))
    expect(docQRVung(a, box, 2)).toBe(payloadPhieuQR('09'))
    expect(docPayloadPhieu(docQRVung(a, box, 2)!)).toEqual({ ma: '09' })
  })
})
