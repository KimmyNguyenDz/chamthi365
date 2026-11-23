// ngam — phát hiện phiếu realtime trong khung camera (port từ ngam.worker gốc).
// Khác nanPhieu: chọn tứ giác theo điểm "vân" (độ đậm vòng ô) + trả cờ ok từng mốc
// để UI vẽ overlay và phát hiện phiếu đứng yên để tự chụp.
import { _noi, type AnhRgba, type AnhXam, type Diem2, type Dom, type H9 } from './omr'
import type { Khuon } from '../types'

const { xam, thuNho, chuanNen, gomDom, mau, chieuH, tiLe, xepGoc, dienTich, homography, NGUONG } = _noi

export type MocNgam = { p: Diem2; c: number; ok: boolean }
export type KqNgam = {
  id: string; ms: number
  khop: number; tong: number
  goc: Diem2[] | null        // tứ giác trang (px ảnh gốc)
  gocMoc: Diem2[] | null     // tứ giác khung mốc
  gocCanh: number[] | null   // cạnh mốc tại từng góc (px)
  gocOk: boolean[] | null
  moc: MocNgam[]
  vuong: Diem2[]             // top 12 đốm đen (debug overlay)
  net: number                // độ nét trong khung (gradient trung bình)
  van: Float32Array | null   // độ đậm tại toàn bộ ô (so khung trước → phát hiện đứng yên)
  vanTrang: Float32Array | null
}

const CANH_MAX = 1024

/** Toàn bộ tọa độ ô của khuôn (dùng chấm điểm vân) */
export function toanBoO(t: Khuon): Diem2[] {
  return [
    ...t.sbd.flat(), ...t.ma.flat(),
    ...t.p1.flatMap(r => r.o),
    ...t.p2.flatMap(r => r.y.flat()),
    ...t.p3.flatMap(r => r.c.flatMap(n => [...n.so, ...(n.tru ? [n.tru] : []), ...(n.phay ? [n.phay] : [])])),
  ]
}

type KhopNhan = { ok: boolean[]; cap: { s: Diem2; d: Diem2 }[]; khop: number }

/** Khớp mốc theo H — trả cờ ok từng mốc (để vẽ overlay) */
function khopMocNhan(t: H9, r: KhuonToiThieu, n: Dom[]): KhopNhan {
  const o: boolean[] = [], a: { s: Diem2; d: Diem2 }[] = []
  for (const [s, e, i] of r.moc) {
    const l = chieuH(t, s, e), u = tiLe(t, s, e)
    let f: Dom | null = null, p = Infinity
    if (u > 0)
      for (const w of n) {
        const d = Math.hypot(w.x - l[0], w.y - l[1])
        if (d < p) { p = d; f = w }
      }
    const x = f ? f.canh / (i * u) : 0
    const m = !!f && p < Math.max(4, i * .6) * u && x > .55 && x < 1.6
    o.push(m)
    if (m && f) a.push({ s: [s, e], d: [f.x, f.y] })
  }
  return { ok: o, cap: a, khop: a.length }
}

// tổ hợp 4 góc lớn của khuôn (cache WeakMap)
const cacheGoc = new WeakMap<KhuonToiThieu, Diem2[][]>()
function toHopGocLon(t: KhuonToiThieu): Diem2[][] {
  let r = cacheGoc.get(t)
  if (r) return r
  const n = Math.max(...t.moc.map(a => a[2]))
  const o = t.moc.filter(a => a[2] > .8 * n).map((a): Diem2 => [a[0], a[1]])
  r = []
  if (o.length <= 14)
    for (let a = 0; a < o.length; a++)
      for (let c = a + 1; c < o.length; c++)
        for (let e = c + 1; e < o.length; e++)
          for (let i = e + 1; i < o.length; i++) {
            const l = xepGoc([o[a], o[c], o[e], o[i]])
            if (dienTich(l) >= .15 * t.trang[0] * t.trang[1]) r.push(l)
          }
  cacheGoc.set(t, r)
  return r
}

const VONG8 = Array.from({ length: 8 }, (_, r) => 2 * Math.PI * r / 8)

/** Điểm vân: độ đậm vòng ô sau khi chiếu H (≥.01 = tứ giác chắc đúng) */
function diemVan(t: H9, r: { rk?: Record<string, number>; r: number }, n: Diem2[], o: AnhXam): number {
  const a = r.rk?.p1 ?? r.r
  const c = Math.max(1, Math.floor(n.length / 80))
  let e = 0, i = 0
  for (let l = 0; l < n.length; l += c) {
    const [u, f] = n[l]
    for (const p of VONG8) {
      const x = (M: number) => {
        const w = chieuH(t, u + M * Math.cos(p), f + M * Math.sin(p))
        return 1 - mau(o, w[0], w[1]) / 255
      }
      e += x(a) - x(1.4 * a)
      i++
    }
  }
  return i ? e / i : 0
}

export type KhuonToiThieu = Pick<Khuon, 'moc' | 'goc' | 'trang' | 'r'> & { rk?: Record<string, number> }
type KqTuGiac = { H: H9; khop: number; ok: boolean[]; d?: number; cap?: { s: Diem2; d: Diem2 }[] }

/** Tìm tứ giác phiếu: 4 đỉnh cực trị → tổ hợp 4 → tổ hợp góc-lớn khuôn; chấm bằng vân */
export function timTuGiac(
  t: Dom[], r: KhuonToiThieu,
  n: number, o: Diem2[], a: AnhXam, c = true, e = false,
): KqTuGiac | null {
  const i = Math.max(4, Math.ceil(.7 * r.moc.length))
  const l = xepGoc(r.goc as Diem2[])
  const u: KqTuGiac[] = []
  const f = (y: Diem2, s: Diem2) => Math.hypot(y[0] - s[0], y[1] - s[1])
  const p = (y: Diem2[]) => (f(y[0], y[1]) + f(y[2], y[3])) / Math.max(1e-6, f(y[1], y[2]) + f(y[3], y[0]))
  let x = 0
  const M = (y: Dom[] | { x: number; y: number }[], s = l, m = false) => {
    const h = xepGoc(y.map((k): Diem2 => [k.x, k.y]))
    if (dienTich(h) < .04 * n) return
    const g = m ? p(s) : 0, b = m ? p(h) : 0
    for (let k = 0; k < 4; k++) {
      if (m && Math.abs(Math.log(g * (k % 2 ? b : 1 / b))) > .2) continue
      x++
      const T = homography(s, h.slice(k).concat(h.slice(0, k)))
      if (!T) continue
      const C = khopMocNhan(T, r, t)
      if (C.khop >= i) u.push({ H: T, ...C })
    }
  }
  const w = new Set<KqTuGiac>()
  const d = (): KqTuGiac | null => {
    let y: KqTuGiac | null = null
    const s = u.filter(m => !w.has(m)).sort((m, h) => h.khop - m.khop).slice(0, 8)
    for (const m of s) {
      w.add(m)
      let h = m
      const g = (m.cap?.length ?? 0) >= 4 ? homography(m.cap!.map(k => k.s), m.cap!.map(k => k.d)) : null
      if (g) {
        const k = khopMocNhan(g, r, t)
        if (k.khop >= m.khop) h = { H: g, khop: k.khop, ok: k.ok, cap: k.cap }
      }
      const b = diemVan(h.H, r, o, a)
      if ((b >= .01 || h.khop >= .9 * r.moc.length) &&
        (!y || h.khop > y.khop || (h.khop === y.khop && b > (y.d ?? 0))))
        y = { ...h, d: b }
    }
    return y
  }
  const A = t.slice().sort((y, s) => s.canh - y.canh)
  const I: number[] = []
  for (const y of A) if (!I.some(s => y.canh > .8 * s && y.canh < 1.25 * s)) I.push(y.canh)
  const S = I.slice(0, 6).map(y => A.filter(s => s.canh > .62 * y && s.canh < 1.6 * y)).filter(y => y.length >= 4)
  for (const y of S) {
    const s = [
      y.reduce((h, g) => (g.x + g.y < h.x + h.y ? g : h)),
      y.reduce((h, g) => (g.x - g.y > h.x - h.y ? g : h)),
      y.reduce((h, g) => (g.x + g.y > h.x + h.y ? g : h)),
      y.reduce((h, g) => (g.x - g.y < h.x - h.y ? g : h)),
    ]
    if (new Set(s.map(z => `${z.x},${z.y}`)).size === 4) M(s, l, e)
    if (!u.length) {
      const h = y.slice(0, 6)
      for (let g = 0; g < h.length; g++)
        for (let b = g + 1; b < h.length; b++)
          for (let k = b + 1; k < h.length; k++)
            for (let T = k + 1; T < h.length; T++)
              M([h[g], h[b], h[k], h[T]], l, e)
    }
    const m = u.length ? d() : null
    if (m) return m
  }
  if (!c) return null
  const U = toHopGocLon(r)
  if (!U.length) return null
  for (const y of S.slice(0, 2)) {
    if (y.length < i) continue
    const s = y.slice().sort((m, h) => Math.abs(m.tron - .64) - Math.abs(h.tron - .64)).slice(0, 7)
    for (let m = 0; m < s.length; m++)
      for (let h = m + 1; h < s.length; h++)
        for (let g = h + 1; g < s.length; g++)
          for (let b = g + 1; b < s.length; b++) {
            const k = u.length
            for (const T of U) M([s[m], s[h], s[g], s[b]], T, true)
            if (u.length > k) {
              const T = d()
              if (T) return T
            }
            if (x > 5e3) return null
          }
  }
  return null
}

const B = 7
/** Lưới độ đậm 7×B trên vùng góc (dấu vân tay thô của trang) */
function vanTrang(t: Khuon, r: H9, n: AnhXam): Float32Array {
  const o = t.goc.map(x => x[0]), a = t.goc.map(x => x[1])
  const c = Math.min(...o), e = Math.min(...a)
  const i = Math.max(...o) - c, l = Math.max(...a) - e
  const u = Math.max(4, Math.round(i / B)), f = Math.max(4, Math.round(l / B))
  const p = new Float32Array(u * f)
  for (let x = 0; x < f; x++)
    for (let M = 0; M < u; M++) {
      let w = 0
      for (const d of [.25, .5, .75])
        for (const A of [.25, .5, .75]) {
          const I = chieuH(r, c + (M + A) / u * i, e + (x + d) / f * l)
          w += 1 - mau(n, I[0], I[1]) / 255
        }
      p[x * u + M] = w / 9
    }
  return p
}

/** Tứ giác hợp lệ: đỉnh hữu hạn trong ±.5 khung, lồi, diện tích >1% khung */
function tuGiacHopLe(t: Diem2[], r: number, n: number): boolean {
  if (t.some(c => !Number.isFinite(c[0]) || !Number.isFinite(c[1]) || c[0] < -.5 * r || c[0] > 1.5 * r || c[1] < -.5 * n || c[1] > 1.5 * n)) return false
  let o = 0
  for (let c = 0; c < 4; c++) {
    const e = t[c], i = t[(c + 1) % 4], l = t[(c + 2) % 4]
    const u = (i[0] - e[0]) * (l[1] - i[1]) - (i[1] - e[1]) * (l[0] - i[0])
    const f = Math.sign(u)
    if (!f || (o && f !== o)) return false
    o = f
  }
  return dienTich(t) > .01 * r * n
}

/** Độ nét trong tứ giác (gradient trung bình, bước 3px) */
function doNet(t: AnhXam, r: Diem2[]): number {
  const n = Math.max(1, Math.min(...r.map(l => l[0])) | 0)
  const o = Math.min(t.w - 2, Math.max(...r.map(l => l[0])) | 0)
  const a = Math.max(1, Math.min(...r.map(l => l[1])) | 0)
  const c = Math.min(t.h - 2, Math.max(...r.map(l => l[1])) | 0)
  let e = 0, i = 0
  for (let l = a; l < c; l += 3) {
    const u = l * t.w
    for (let f = n; f < o; f += 3) {
      const p = t.d[u + f]
      e += Math.abs(p - t.d[u + f + 1]) + Math.abs(p - t.d[u + f + t.w])
      i++
    }
  }
  return i ? e / i : 0
}

/** Chạy ngam trên khung ảnh RGBA → kết quả overlay + vân (so sánh đứng yên) */
export function ngam(t: Khuon, r: Diem2[], n: string, o: number, a: number, c: Uint8ClampedArray, e = CANH_MAX): KqNgam {
  const i = performance.now()
  const l: KqNgam = {
    id: n, ms: 0, khop: 0, tong: t.moc.length,
    goc: null, gocMoc: null, gocCanh: null, gocOk: null,
    moc: [], vuong: [], net: 0, van: null, vanTrang: null,
  }
  const u = thuNho(xam({ w: o, h: a, d: c }), e)
  const f = chuanNen(u.anh), p = 1 / u.heSo
  let x: Dom[] = [], M: KqTuGiac | null = null
  for (const w of NGUONG) {
    const d = gomDom(f, w.nguong, w.nenSang)
    if (!x.length) x = d
    M = d.length >= 4 ? timTuGiac(d, t, f.w * f.h, r, f) : null
    if (M) { x = d; break }
  }
  l.vuong = x.slice().sort((w, d) => d.canh - w.canh).slice(0, 12).map((w): Diem2 => [w.x * p, w.y * p])
  try {
    if (!M) throw 0
    const { H: w } = M
    const [d, A] = t.trang
    const I: Diem2[] = [[0, 0], [d, 0], [d, A], [0, A]].map(([y, s]) => {
      const m = chieuH(w, y, s)
      return [m[0] * p, m[1] * p]
    })
    if (!tuGiacHopLe(I, o, a)) throw 0
    l.goc = I
    l.khop = M.khop
    l.gocMoc = t.goc.map(([y, s]) => {
      const m = chieuH(w, y, s)
      return [m[0] * p, m[1] * p]
    })
    const S = t.goc.map(([y, s]) =>
      t.moc.reduce((m, h, g) => (Math.hypot(h[0] - y, h[1] - s) < Math.hypot(t.moc[m][0] - y, t.moc[m][1] - s) ? g : m), 0))
    l.gocCanh = S.map((y, s) => t.moc[y][2] * tiLe(w, t.goc[s][0], t.goc[s][1]) * p)
    l.gocOk = S.map(y => M.ok[y])
    l.moc = t.moc.map(([y, s, m], h) => {
      const g = chieuH(w, y, s)
      return { p: [g[0] * p, g[1] * p] as Diem2, c: m * tiLe(w, y, s) * p, ok: M.ok[h] }
    })
    const U = new Float32Array(r.length)
    r.forEach(([y, s], m) => {
      const h = chieuH(w, y, s)
      U[m] = 1 - mau(f, h[0], h[1]) / 255
    })
    l.van = U
    l.vanTrang = vanTrang(t, w, f)
    l.net = doNet(f, l.goc.map(([y, s]): Diem2 => [y / p, s / p]))
  } catch { /* không đủ dữ kiện — trả kết quả rỗng */ }
  l.ms = performance.now() - i
  return l
}
