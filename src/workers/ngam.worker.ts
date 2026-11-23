/// <reference lib="webworker" />
import { ngam, toanBoO } from '../lib/ngam'
import type { Khuon } from '../types'
import type { Diem2 } from '../lib/omr'

const Z = self as unknown as Worker
let khuon: Khuon | null = null
let cacO: Diem2[] = []

Z.onmessage = (t: MessageEvent) => {
  const r = t.data
  if (r.loai === 'khuon') {
    khuon = r.khuon as Khuon
    cacO = toanBoO(khuon)
    return
  }
  if (!khuon) return
  const n = ngam(khuon, cacO, r.id, r.w, r.h, new Uint8ClampedArray(r.buf))
  Z.postMessage(n, [n.van, n.vanTrang].flatMap(o => (o ? [o.buffer as ArrayBuffer] : [])))
}
