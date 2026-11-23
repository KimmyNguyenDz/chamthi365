import { describe, it, expect } from 'vitest'
import { taoBoMayCham, type WorkerLike } from './mayCham'
import { xuLyTin } from '../workers/may-cham.core'
import { khuonTest, render } from './omr.test'

/** Worker giả: chạy thẳng xuLyTin trong tiến trình test */
class WorkerGia implements WorkerLike {
  onmessage: ((e: { data: unknown }) => void) | null = null
  postMessage(d: unknown) {
    const msg = d as Parameters<typeof xuLyTin>[0]
    const data = msg.bmp
      ? msg
      : { ...msg, buf: (msg.buf as ArrayBuffer).slice(0) }
    xuLyTin(data).then(r => this.onmessage?.({ data: r }))
  }
  terminate() {}
}

describe('taoBoMayCham', () => {
  const k = khuonTest()

  it('chấm ảnh qua pool → KqCham', async () => {
    const bo = taoBoMayCham({ soWorker: 2, taoWorker: () => new WorkerGia() })
    const a = render(k, 3, new Set(['sbd:0:5', 'ma:0:1', 'p1:0:3']))
    const kq = await bo.cham({ w: a.w, h: a.h, buf: a.d.buffer as ArrayBuffer }, k)
    expect(kq.ok).toBe(true)
    expect(kq.doc?.sbd).toBe('5?') // cột 2 chưa tô → ?
    expect(kq.doc?.ma).toBe('1')
    expect(kq.doc?.p1[0]).toBe('D')
    bo.dung()
  })

  it('giới hạn song song theo số worker + xếp hàng', async () => {
    let dangChay = 0, maxSong = 0
    class Cham implements WorkerLike {
      onmessage: ((e: { data: unknown }) => void) | null = null
      postMessage(msg: unknown) {
        const id = (msg as { id: string }).id
        dangChay++; maxSong = Math.max(maxSong, dangChay)
        setTimeout(() => { dangChay--; this.onmessage?.({ data: { id, ok: true, kq: {} } }) }, 5)
      }
      terminate() {}
    }
    const bo = taoBoMayCham({ soWorker: 2, taoWorker: () => new Cham() })
    const a = { w: 4, h: 4, buf: new ArrayBuffer(4 * 4 * 4) }
    await Promise.all(Array.from({ length: 6 }, () => bo.cham(a, k)))
    expect(maxSong).toBe(2)
    bo.dung()
  })

  it('lỗi worker → reject với mã lỗi', async () => {
    const bo = taoBoMayCham({ soWorker: 1, taoWorker: () => new WorkerGia() })
    const trang = { w: 100, h: 100, buf: new Uint8ClampedArray(100 * 100 * 4).fill(255).buffer as ArrayBuffer }
    const kq = bo.cham(trang, k)
    await expect(kq).rejects.toMatchObject({ ma: 'thieu_moc' })
    bo.dung()
  })
})

describe('xuLyTin (core worker)', () => {
  it('trả {ok, doc, can, o} cho ảnh hợp lệ', async () => {
    const k = khuonTest()
    const a = render(k, 3, new Set(['sbd:0:9', 'p1:1:1']))
    const r = await xuLyTin({ id: 'x', w: a.w, h: a.h, buf: a.d.buffer as ArrayBuffer, khuon: k, luu: false })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.doc?.sbd).toBe('9?')
      expect(r.doc?.p1[1]).toBe('B')
      expect(r.ms).toBeGreaterThan(0)
    }
  })

  it('ảnh trắng → {ok:false, ma}', async () => {
    const k = khuonTest()
    const r = await xuLyTin({ id: 'x', w: 50, h: 50, buf: new Uint8ClampedArray(50 * 50 * 4).fill(255).buffer as ArrayBuffer, khuon: k, luu: false })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.ma).toBe('thieu_moc')
  })
})
