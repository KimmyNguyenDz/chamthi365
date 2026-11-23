import type { Khuon, KqCham } from '../types'
import type { TinVao, TinRa } from '../workers/may-cham.core'
import { idMoi } from './id'

export interface WorkerLike {
  onmessage: ((e: { data: TinRa }) => void) | null
  postMessage(d: TinVao, transfer?: Transferable[]): void
  terminate(): void
}

export type AnhVao =
  | { w: number; h: number; buf: ArrayBuffer }
  | { bmp: ImageBitmap }

export type KqMay = { ok: boolean; ms?: number; doc?: KqCham['doc'] & object; can?: KqCham['can']; o?: KqCham['o']; xoay180?: boolean; anh?: Blob | null; chatLuong?: Record<string, number>; ma?: string; loi?: string }

type Viec = {
  msg: TinVao
  giai: (k: TinRa & { ok: true }) => void
  tuChoi: (e: { ma: string; loi: string }) => void
}

/** Pool N worker chấm phiếu; mỗi worker 1 việc/lần, việc thừa xếp hàng */
export function taoBoMayCham(tuyChon: { soWorker?: number; taoWorker?: () => WorkerLike } = {}) {
  const n = Math.max(1, tuyChon.soWorker ?? (typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 2) : 2))
  const taoW = tuyChon.taoWorker ?? (() => new Worker(new URL('../workers/may-cham.worker.ts', import.meta.url), { type: 'module' }) as WorkerLike)
  const ds: { w: WorkerLike; ban: boolean }[] = []
  const hang: Viec[] = []
  const cho = new Map<string, Viec>()

  const chayTiep = () => {
    for (const wk of ds) {
      if (wk.ban || !hang.length) continue
      const v = hang.shift()!
      wk.ban = true
      cho.set(v.msg.id, v)
      const transfer: Transferable[] = v.msg.buf ? [v.msg.buf] : []
      wk.w.postMessage(v.msg, transfer)
    }
  }

  for (let i = 0; i < n; i++) {
    const w = taoW()
    const rec = { w, ban: false }
    w.onmessage = e => {
      const r = e.data
      const v = cho.get(r.id)
      cho.delete(r.id)
      rec.ban = false
      if (v) {
        if (r.ok) v.giai(r)
        else v.tuChoi({ ma: r.ma, loi: r.loi })
      }
      chayTiep()
    }
    ds.push(rec)
  }

  const cham = (anh: AnhVao, khuon: Khuon, luu = true): Promise<KqMay> =>
    new Promise((giai, tuChoi) => {
      const msg: TinVao = {
        id: idMoi(), khuon, luu,
        w: 'w' in anh ? anh.w : 0, h: 'h' in anh ? anh.h : 0,
        ...('buf' in anh ? { buf: anh.buf } : { bmp: anh.bmp }),
      }
      hang.push({ msg, giai: r => giai(r as KqMay), tuChoi })
      chayTiep()
    })

  return {
    cham,
    dung: () => { for (const wk of ds) wk.w.terminate(); hang.length = 0 },
    get soViecCho() { return hang.length },
  }
}
