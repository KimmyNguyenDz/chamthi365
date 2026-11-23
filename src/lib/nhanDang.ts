// nhan-dang — nhận loại phiếu từ ảnh (port từ nhan-dang.worker gốc).
// DB: /thu-vien/nhan-dang.json {dai, nhom:[{k:{trang,goc,moc,r,rk,o}, ks:[id..]}], mau:{id:[off,w,h]}}
//     + nhan-dang.bin (fingerprint xám w×h của từng khuôn, vùng bbox goc).
// Thuật toán: phát hiện tứ giác theo mốc → homography unit-square→goc →
// warp ảnh chuẩn hoá về lưới w×h → tương quan Pearson với fingerprint lưu sẵn.
import { _noi, type AnhRgba, type AnhXam, type Diem2, type Dom } from './omr'
import { timTuGiac } from './ngam'

const { xam, thuNho, chuanNen, gomDom, mau, chieuH, homography, NGUONG } = _noi

export type KhuonNhan = {
  trang: [number, number]; goc: Diem2[]; moc: [number, number, number][]
  r: number; rk?: Record<string, number>; o: Diem2[]
}
export type DbNhanDang = {
  dai: number
  nhom: { k: KhuonNhan; ks: string[] }[]
  mau: Record<string, [number, number, number]>
  bin: Uint8Array
}
export type GoiY = { khuon: string; diem: number }
export type KqNhanDang = { goiY: GoiY[]; ms: number; soKieu: number }

/** Pearson correlation giữa 2 mảng cùng độ dài */
function pearson(n: ArrayLike<number>, c: ArrayLike<number>): number {
  const t = n.length
  let o = 0, r = 0
  for (let l = 0; l < t; l++) { o += n[l]; r += c[l] }
  o /= t; r /= t
  let s = 0, e = 0, a = 0
  for (let l = 0; l < t; l++) {
    const i = n[l] - o, u = c[l] - r
    s += i * u; e += i * i; a += u * u
  }
  return s / Math.sqrt(e * a + 1e-9)
}

const BUOC = [.25, .5, .75]

export function nhanDang(anh: AnhRgba, c: DbNhanDang, t = 1024): KqNhanDang {
  const o = performance.now()
  const r = chuanNen(thuNho(xam(anh), t).anh)
  const s = r.w * r.h
  const e: GoiY[] = []
  let a = 0
  const l = (y: Dom[], m: KhuonNhan, w: string[], x: boolean) => {
    const A: KhuonNhan = { ...m, rk: m.rk ?? undefined }
    const I = timTuGiac(y, A, s, m.o, r, x, true)
    if (!I) return
    a++
    const S = homography([[0, 0], [1, 0], [1, 1], [0, 1]], m.goc.map(([D, d]) => chieuH(I.H, D, d)))
    if (!S) return
    for (const D of w) {
      const d = c.mau[D]
      if (!d) continue
      const [f, g, h] = d
      const M = new Float32Array(g * h)
      for (let b = 0; b < h; b++)
        for (let k = 0; k < g; k++) {
          let C = 0
          for (const T of BUOC)
            for (const v of BUOC) {
              const G = chieuH(S, (k + v) / g, (b + T) / h)
              C += mau(r, G[0], G[1])
            }
          M[b * g + k] = C / 9
        }
      e.push({ khuon: D, diem: pearson(M, c.bin.subarray(f, f + g * h)) })
    }
  }
  const i = NGUONG.map(y => gomDom(r, y.nguong, y.nenSang)).filter(y => y.length >= 4)
  for (const y of i) {
    for (const { k: m, ks: w } of c.nhom) l(y, m, w, false)
    if (e.length) break
  }
  const u = 4e3, p = performance.now()
  if (!e.length) {
    const y = (w: Dom[]) => {
      const x = w.slice().sort((I, S) => S.canh - I.canh), A: number[] = []
      for (const I of x) if (!A.some(S => I.canh > .8 * S && I.canh < 1.25 * S)) A.push(I.canh)
      return A.map(I => x.filter(S => S.canh > .62 * I && S.canh < 1.6 * I).length)
    }
    const m = i.flatMap(w => {
      const x = y(w)
      return c.nhom.map(A => ({
        vs: w, g: A,
        lech: Math.min(...x.map(I => Math.abs(A.k.moc.length - I))),
      }))
    }).sort((w, x) => w.lech - x.lech)
    for (const { vs: w, g: x } of m) {
      if (e.length || performance.now() - p > u) break
      l(w, x.k, x.ks, true)
    }
  }
  e.sort((y, m) => m.diem - y.diem)
  return { goiY: e.slice(0, 12), ms: performance.now() - o, soKieu: a }
}

// ---------- tải DB (inject được fetch cho test/PWA) ----------

const BASE = '/thu-vien/'
let cacheDb: Promise<DbNhanDang> | null = null

export function taiDbNhanDang(fetchFn: typeof fetch = fetch): Promise<DbNhanDang> {
  cacheDb ??= Promise.all([
    fetchFn(BASE + 'nhan-dang.json').then(n => { if (!n.ok) throw new Error('json'); return n.json() }),
    fetchFn(BASE + 'nhan-dang.bin').then(n => { if (!n.ok) throw new Error('bin'); return n.arrayBuffer() }),
  ]).then(([n, c]) => ({ ...n, bin: new Uint8Array(c) }))
  cacheDb.catch(() => { cacheDb = null })
  return cacheDb
}
