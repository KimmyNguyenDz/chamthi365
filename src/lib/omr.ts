// OMR core — port nguyên pipeline từ may-cham.worker của app gốc:
// gray → thu nhỏ ≤2000px → chuẩn hoá nền → tìm blob (2 ngưỡng) → khớp 4 góc +
// mốc phụ → homography (DLT chuẩn hoá + tinh chỉnh lặp + hiệu chỉnh cục bộ) →
// căn lưới ô theo khối → đo độ đậm/viền → phân loại to/nghi/tay/trong →
// giải mã SBD, mã đề, P1, P2 (Đ/S), P3 (số, trừ, phẩy), khối khác.
import type { Khuon } from '../types'

export type AnhRgba = { w: number; h: number; d: Uint8ClampedArray | Uint8Array }
export type AnhXam = { w: number; h: number; d: Uint8Array | Uint8ClampedArray }
export type Diem2 = [number, number]
export type H9 = number[]
export type Dom = { x: number; y: number; canh: number; tron: number }

export class LoiCham extends Error {
  ma: string
  constructor(ma: string, msg: string) { super(msg); this.ma = ma }
}

export type ODoc = { x: number; y: number; dam: number; sang: number; vien: number; tt: string }
export type CauP1 = { q: number; chon: string; nghi: boolean; o: ODoc[] }
export type CauP2 = { q: number; y: string[]; nghi: boolean[]; o: ODoc[][] }
export type CauP3 = {
  q: number; s: string; hopLe: boolean; nghi: boolean
  o: { so: ODoc[]; tru?: ODoc; phay?: ODoc }[]
}
export type DocCot = { s: string; nghi: boolean; o: ODoc[][] }
export type KqOmr = {
  sbd: DocCot | null
  ma: DocCot | null
  khac?: { ten: string; s: string; nghi: boolean; o: ODoc[][] }[]
  p1: CauP1[]
  p2: CauP2[]
  p3: CauP3[]
  nghi: string[]
  chatLuong: { doNet: number; khopMoc: number; tongMoc: number; xoay180: boolean; nguong: number; damTo: number }
  chieu: (x: number, y: number) => Diem2
}

// ---------- tiền xử lý ----------

function xam(a: AnhRgba): AnhXam {
  const n = a.w * a.h, d = new Uint8Array(n), e = a.d
  for (let i = 0, h = 0; i < n; i++, h += 4) d[i] = (e[h] * 77 + e[h + 1] * 150 + e[h + 2] * 29) >> 8
  return { w: a.w, h: a.h, d }
}

function thuNho(a: AnhXam, c: number): { anh: AnhXam; heSo: number } {
  const o = Math.max(a.w, a.h) / c
  if (o <= 1) return { anh: a, heSo: 1 }
  const e = Math.round(a.w / o), i = Math.round(a.h / o), h = new Uint8Array(e * i)
  for (let s = 0; s < i; s++) {
    const u = Math.floor(s * o), m = Math.min(a.h, Math.max(u + 1, Math.floor((s + 1) * o)))
    for (let x = 0; x < e; x++) {
      const g = Math.floor(x * o), r = Math.min(a.w, Math.max(g + 1, Math.floor((x + 1) * o)))
      let A = 0
      for (let d = u; d < m; d++) { const v = d * a.w; for (let y = g; y < r; y++) A += a.d[v + y] }
      h[s * e + x] = A / ((m - u) * (r - g))
    }
  }
  return { anh: { w: e, h: i, d: h }, heSo: 1 / o }
}

/** Chuẩn hoá nền không đều: percentile 5%/ô 16px → max-filter ×2 → blur 3×3 → chia nền */
function chuanNen(a: AnhXam, c = 16): AnhXam {
  const o = Math.ceil(a.w / c), e = Math.ceil(a.h / c)
  let i = new Float32Array(o * e)
  const h = new Uint16Array(256)
  for (let m = 0; m < e; m++)
    for (let x = 0; x < o; x++) {
      let g = 0
      const r = Math.min(a.h, (m + 1) * c), A = Math.min(a.w, (x + 1) * c)
      h.fill(0)
      let d = 0
      for (let y = m * c; y < r; y += 2)
        for (let C = x * c + (y & 2 ? 1 : 0); C < A; C += 2) { h[a.d[y * a.w + C]]++; d++ }
      let v = 0
      for (let y = 255; y >= 0; y--) if ((v += h[y]) >= d * .05) { g = y; break }
      i[m * o + x] = g
    }
  for (let m = 0; m < 2; m++) {
    const x = new Float32Array(o * e)
    for (let g = 0; g < e; g++)
      for (let r = 0; r < o; r++) {
        let A = 0
        for (let d = -1; d <= 1; d++)
          for (let v = -1; v <= 1; v++) {
            const y = g + d, C = r + v
            if (y >= 0 && y < e && C >= 0 && C < o && i[y * o + C] > A) A = i[y * o + C]
          }
        x[g * o + r] = A
      }
    i = x
  }
  const s = new Float32Array(o * e)
  for (let m = 0; m < e; m++)
    for (let x = 0; x < o; x++) {
      let g = 0, r = 0
      for (let A = -1; A <= 1; A++)
        for (let d = -1; d <= 1; d++) {
          const v = m + A, y = x + d
          if (v >= 0 && v < e && y >= 0 && y < o) { g += i[v * o + y]; r++ }
        }
      s[m * o + x] = Math.max(40, g / r)
    }
  const u = new Uint8Array(a.w * a.h)
  for (let m = 0; m < a.h; m++) {
    const x = Math.min(e - 1.001, Math.max(0, m / c - .5)), g = Math.floor(x), r = x - g
    for (let A = 0; A < a.w; A++) {
      const d = Math.min(o - 1.001, Math.max(0, A / c - .5)), v = Math.floor(d), y = d - v
      const C = g * o + v
      const j = (s[C] * (1 - y) + s[C + 1] * y) * (1 - r) + (s[C + o] * (1 - y) + s[C + o + 1] * y) * r
      const J = a.d[m * a.w + A] * 255 / j
      u[m * a.w + A] = J > 255 ? 255 : J
    }
  }
  return { w: a.w, h: a.h, d: u }
}

/** Mẫu bilinear trên ảnh xám (ngoài biên = 255) */
function mau(a: AnhXam, c: number, o: number): number {
  if (c < 0 || o < 0 || c >= a.w - 1 || o >= a.h - 1) return 255
  const e = c | 0, i = o | 0, h = c - e, s = o - i, u = i * a.w + e, m = a.d
  return (m[u] * (1 - h) + m[u + 1] * h) * (1 - s) + (m[u + a.w] * (1 - h) + m[u + a.w + 1] * h) * s
}

// ---------- tìm đốm đen (mốc) ----------

const NGUONG = [{ nguong: [105], nenSang: false }, { nguong: [135, 160], nenSang: true }]

/** Độ sáng vòng ngoài đốm — lọc đốm nằm trên nền tối */
function sangVongNgoai(a: AnhXam, c: Dom): number {
  const o: number[] = []
  for (const e of [.95, 1.15])
    for (let i = 0; i < 24; i++) {
      const h = 2 * Math.PI * i / 24
      const s = Math.round(c.x + e * c.canh * Math.cos(h)), u = Math.round(c.y + e * c.canh * Math.sin(h))
      o.push(s < 0 || u < 0 || s >= a.w || u >= a.h ? 0 : a.d[u * a.w + s])
    }
  return o.sort((e, i) => e - i), o[Math.floor(o.length * .1)]
}

function gomDom(a: AnhXam, c: number[], o = false): Dom[] {
  const e: Dom[] = []
  for (const i of c)
    for (const h of timDom(a, i))
      e.some(s => Math.hypot(s.x - h.x, s.y - h.y) < .5 * Math.max(s.canh, h.canh)) || e.push(h)
  return o ? e.filter(i => sangVongNgoai(a, i) >= 200) : e
}

/** Connected-components 8-láng giềng trên pixel < ngưỡng; lọc blob vuông-không-tròn */
function timDom(a: AnhXam, c = 105): Dom[] {
  const { w: o, h: e, d: i } = a
  const h = new Int32Array(o * e), s = [0]
  const u = (f: number): number => { for (; s[f] !== f;) { s[f] = s[s[f]]; f = s[f] } return f }
  const m = (f: number, p: number) => { f = u(f); p = u(p); if (f !== p) s[Math.max(f, p)] = Math.min(f, p) }
  let x = 1
  for (let f = 0; f < e; f++) {
    const p = f * o
    for (let M = 0; M < o; M++) {
      if (i[p + M] >= c) continue
      const w = M > 0 ? h[p + M - 1] : 0
      const S = f > 0 ? h[p - o + M] : 0
      const q = f > 0 && M > 0 ? h[p - o + M - 1] : 0
      const E = f > 0 && M < o - 1 ? h[p - o + M + 1] : 0
      let P = w || S || q || E
      if (!P) { P = x++; s.push(P) } else for (const H of [w, S, q, E]) H && H !== P && m(P, H)
      h[p + M] = P
    }
  }
  const g = x, r = new Int32Array(g), A = new Float64Array(g), d = new Float64Array(g)
  const v = new Int32Array(g).fill(o), y = new Int32Array(g).fill(-1)
  const C = new Int32Array(g).fill(e), j = new Int32Array(g).fill(-1)
  for (let f = 1; f < g; f++) s[f] = u(f)
  for (let f = 0; f < e; f++) {
    const p = f * o
    for (let M = 0; M < o; M++) {
      let w = h[p + M]
      if (w) {
        w = s[w]; h[p + M] = w; r[w]++; A[w] += M; d[w] += f
        if (M < v[w]) v[w] = M
        if (M > y[w]) y[w] = M
        if (f < C[w]) C[w] = f
        if (f > j[w]) j[w] = f
      }
    }
  }
  const J = 20, $ = (Math.min(o, e) / 10) ** 2, T: Dom[] = []
  for (let f = 1; f < g; f++) {
    const p = r[f]
    if (p < J || p > $) continue
    const M = y[f] - v[f] + 1, w = j[f] - C[f] + 1
    if (M / w > 1.9 || w / M > 1.9 || p / (M * w) < .45) continue
    const S = A[f] / p, q = d[f] / p
    let E = 0, P = 0, H = 0
    const et = new Int32Array(M).fill(1 << 30), K = new Int32Array(M).fill(-1)
    for (let L = C[f]; L <= j[f]; L++) {
      let st = 1073741824, ht = -1
      for (let X = v[f]; X <= y[f]; X++) {
        if (h[L * o + X] !== f) continue
        const yt = (X - S) ** 2 + (L - q) ** 2
        if (yt > E) E = yt
        if (X < st) st = X
        if (X > ht) ht = X
        const it = X - v[f]
        if (L < et[it]) et[it] = L
        if (L > K[it]) K[it] = L
      }
      if (ht >= 0) P += ht - st + 1
    }
    for (let L = 0; L < M; L++) if (K[L] >= 0) H += K[L] - et[L] + 1
    if (p / P < .9 || p / H < .9) continue
    const W = p / (Math.PI * (Math.sqrt(E) + .5) ** 2)
    if (W > .8) continue
    T.push({ x: S, y: q, canh: Math.sqrt(p), tron: W })
  }
  return T
}

// ---------- homography (DLT chuẩn hoá) ----------

function chieuH(a: H9, c: number, o: number): Diem2 {
  const e = a[6] * c + a[7] * o + a[8]
  return [(a[0] * c + a[1] * o + a[2]) / e, (a[3] * c + a[4] * o + a[5]) / e]
}

function giaiTT(a: number[], c: number[], o: number): number[] | null {
  const e = a.slice(), i = c.slice()
  for (let s = 0; s < o; s++) {
    let u = s
    for (let m = s + 1; m < o; m++) if (Math.abs(e[m * o + s]) > Math.abs(e[u * o + s])) u = m
    if (Math.abs(e[u * o + s]) < 1e-12) return null
    if (u !== s) {
      for (let x = 0; x < o; x++) { const g = e[s * o + x]; e[s * o + x] = e[u * o + x]; e[u * o + x] = g }
      const m = i[s]; i[s] = i[u]; i[u] = m
    }
    for (let m = s + 1; m < o; m++) {
      const x = e[m * o + s] / e[s * o + s]
      if (x !== 0) { for (let g = s; g < o; g++) e[m * o + g] -= x * e[s * o + g]; i[m] -= x * i[s] }
    }
  }
  const h = new Array(o).fill(0)
  for (let s = o - 1; s >= 0; s--) {
    let u = i[s]
    for (let m = s + 1; m < o; m++) u -= e[s * o + m] * h[m]
    h[s] = u / e[s * o + s]
  }
  return h
}

function chuanHoa(a: Diem2[]) {
  let c = 0, o = 0
  for (const [h, s] of a) { c += h; o += s }
  c /= a.length; o /= a.length
  let e = 0
  for (const [h, s] of a) e += Math.hypot(h - c, s - o)
  const i = Math.SQRT2 / Math.max(1e-9, e / a.length)
  return { T: [i, 0, -i * c, 0, i, -i * o, 0, 0, 1], q: a.map(([h, s]): Diem2 => [i * (h - c), i * (s - o)]) }
}

function nhan3(a: H9, c: H9): H9 {
  const o = new Array(9).fill(0)
  for (let e = 0; e < 3; e++)
    for (let i = 0; i < 3; i++)
      for (let h = 0; h < 3; h++) o[e * 3 + i] += a[e * 3 + h] * c[h * 3 + i]
  return o
}

function nghich3(a: H9): H9 {
  const [c, o, e, i, h, s, u, m, x] = a
  const g = h * x - s * m, r = -(i * x - s * u), A = i * m - h * u, d = c * g + o * r + e * A
  return [g / d, -(o * x - e * m) / d, (o * s - e * h) / d, r / d, (c * x - e * u) / d, -(c * s - e * i) / d, A / d, -(c * m - o * u) / d, (c * h - o * i) / d]
}

/** Homography khuôn→ảnh từ ≥4 cặp điểm (DLT + chuẩn hoá Hartley) */
function homography(a: Diem2[], c: Diem2[]): H9 | null {
  if (a.length < 4) return null
  const o = chuanHoa(a), e = chuanHoa(c)
  const i = new Array(64).fill(0), h = new Array(8).fill(0)
  const s = (g: number[], r: number) => {
    for (let A = 0; A < 8; A++) { h[A] += g[A] * r; for (let d = 0; d < 8; d++) i[A * 8 + d] += g[A] * g[d] }
  }
  for (let g = 0; g < o.q.length; g++) {
    const [r, A] = o.q[g], [d, v] = e.q[g]
    s([r, A, 1, 0, 0, 0, -d * r, -d * A], d)
    s([0, 0, 0, r, A, 1, -v * r, -v * A], v)
  }
  const u = giaiTT(i, h, 8)
  if (!u) return null
  const m: H9 = [u[0], u[1], u[2], u[3], u[4], u[5], u[6], u[7], 1]
  const x = nhan3(nhan3(nghich3(e.T), m), o.T)
  return x.map(g => g / x[8])
}

/** Tỉ lệ px/đơn-vị-khuôn tại điểm (đạo hàm địa phương của H) */
function tiLe(a: H9, c: number, o: number): number {
  const e = chieuH(a, c, o), i = chieuH(a, c + 10, o), h = chieuH(a, c, o + 10)
  return (Math.hypot(i[0] - e[0], i[1] - e[1]) + Math.hypot(h[0] - e[0], h[1] - e[1])) / 20
}

/** Sắp 4 điểm theo góc quanh tâm, bắt đầu từ góc trên-trái */
function xepGoc(a: Diem2[]): Diem2[] {
  const c = a.reduce((h, s) => h + s[0], 0) / a.length
  const o = a.reduce((h, s) => h + s[1], 0) / a.length
  const e = a.slice().sort((h, s) => Math.atan2(h[1] - o, h[0] - c) - Math.atan2(s[1] - o, s[0] - c))
  let i = 0
  for (let h = 1; h < 4; h++) if (e[h][0] + e[h][1] < e[i][0] + e[i][1]) i = h
  return e.slice(i).concat(e.slice(0, i))
}

function dienTich(a: Diem2[]): number {
  let c = 0
  for (let o = 0; o < a.length; o++) {
    const e = a[o], i = a[(o + 1) % a.length]
    c += e[0] * i[1] - i[0] * e[1]
  }
  return Math.abs(c) / 2
}

function* toHop<T>(a: T[], c: number, o = 0, e: T[] = []): Generator<T[]> {
  if (e.length === c) { yield e.slice(); return }
  for (let i = o; i < a.length; i++) { e.push(a[i]); yield* toHop(a, c, i + 1, e); e.pop() }
}

type KhopMoc = { khop: number; sai: number; cap: { s: Diem2; d: Diem2 }[] }

/** Đếm số mốc khuôn khớp blob sau khi chiếu qua H */
function khopMoc(a: H9, c: Khuon, o: Dom[]): KhopMoc {
  let e = 0, i = 0
  const h: KhopMoc['cap'] = []
  for (const [s, u, m] of c.moc) {
    const x = chieuH(a, s, u), g = tiLe(a, s, u)
    if (!(g > 0)) return { khop: 0, sai: 1e9, cap: h }
    let r = -1, A = 1e18
    for (let y = 0; y < o.length; y++) {
      const C = (o[y].x - x[0]) ** 2 + (o[y].y - x[1]) ** 2
      if (C < A) { A = C; r = y }
    }
    const d = Math.sqrt(A), v = Math.max(4, m * .6) * g
    if (r >= 0 && d < v) {
      const y = o[r].canh / (m * g)
      if (y > .55 && y < 1.6) { e++; i += d / g; h.push({ s: [s, u], d: [o[r].x, o[r].y] }) }
    }
  }
  return { khop: e, sai: e ? i / e : 1e9, cap: h }
}

type KqNan = {
  H: H9; chieu: (x: number, y: number) => Diem2
  khop: number; tong: number; xoay180: boolean; tl: number
}

/** Nắn phiếu: tìm tứ giác 4 góc, homography, tinh chỉnh, hiệu chỉnh cục bộ */
function nanPhieu(
  a: Dom[], c: Khuon, o: [number, number],
  e?: (H: H9) => number,
): KqNan {
  if (a.length < 4) throw new LoiCham('thieu_moc', 'Không thấy đủ ô vuông đen ở góc phiếu')
  const i = Math.max(...c.moc.map(T => T[2]))
  const h = c.moc.filter(T => T[2] > .8 * i).map((T): Diem2 => [T[0], T[1]])
  const s = a.slice().sort((T, f) => f.canh - T.canh)
  const u: number[] = []
  for (const T of s) u.some(f => T.canh > .8 * f && T.canh < 1.25 * f) || u.push(T.canh)
  const m = u.slice(0, 6)
    .map(T => s.filter(f => f.canh > .5 * T && f.canh < 1.6 * T).slice(0, 12))
    .filter(T => T.length >= 4)
  const x = o[0] * o[1]
  type Ung = { H: H9 } & KhopMoc & { xoay: number }
  let g: Ung | null = null
  const r: Ung[] = []
  const A = (T: Diem2[], f: Diem2[]) => {
    const p = xepGoc(T), M = xepGoc(f)
    if (dienTich(p) < .04 * x) return
    for (let w = 0; w < 4; w++) {
      const S = p.slice(w).concat(p.slice(0, w))
      const q = homography(M, S)
      if (!q) continue
      const E = khopMoc(q, c, a), P = { H: q, ...E, xoay: w }
      if (E.khop >= 4) r.push(P)
      if (!g || E.khop > g.khop || (E.khop === g.khop && E.sai < g.sai)) g = P
    }
  }
  const d = () => {
    const T = g
    return !!T && T.khop >= .9 * c.moc.length
  }
  for (const T of m) {
    const f: Diem2[] = [
      T.reduce((p, M) => (M.x + M.y < p.x + p.y ? M : p)),
      T.reduce((p, M) => (M.x - M.y > p.x - p.y ? M : p)),
      T.reduce((p, M) => (M.x + M.y > p.x + p.y ? M : p)),
      T.reduce((p, M) => (M.x - M.y < p.x - p.y ? M : p)),
    ].map((p): Diem2 => [p.x, p.y])
    if (new Set(f.map(p => p.join())).size === 4) A(f, c.goc as Diem2[])
    if (d()) break
  }
  if (!d()) {
    const T = [...toHop(h, 4)]
    for (const f of m.slice(0, 3)) {
      for (const M of toHop(f.map((w): Diem2 => [w.x, w.y]), 4))
        for (const w of T) A(M, w)
      const p = g as Ung | null
      if (p && p.khop >= Math.max(4, .7 * c.moc.length)) break
    }
  }
  let v: Ung | null = g
  if (v && e) {
    const T = Math.max(4, .7 * c.moc.length)
    const f = r.filter(w => w.khop >= T).sort((w, S) => S.khop - w.khop || w.sai - S.sai)
    const p: H9[] = []
    let M = -1e9
    for (const w of f) {
      if (p.some(q => q.every((E, P) => Math.abs(E - w.H[P]) < 1e-6 * (1 + Math.abs(E))))) continue
      p.push(w.H)
      const S = e(w.H)
      if (S > M) { M = S; v = w }
      if (p.length >= 8) break
    }
  }
  if (!v || v.khop < Math.max(4, .7 * c.moc.length))
    throw new LoiCham('khong_khop', 'Không khớp đủ ô mốc — hãy chụp lại cho thấy đủ 4 góc phiếu')
  let y = v.H, C = v.cap
  for (let T = 0; T < 3; T++) {
    const f = homography(C.map(q => q.s), C.map(q => q.d))
    if (!f) break
    y = f
    const p = khopMoc(y, c, a)
    const M = p.cap.map(q => {
      const E = chieuH(y, q.s[0], q.s[1])
      return Math.hypot(E[0] - q.d[0], E[1] - q.d[1])
    })
    const w = Math.max(2.5 * tiLe(y, c.trang[0] / 2, c.trang[1] / 2), 3 * trungVi(M))
    const S = p.cap.filter((q, E) => M[E] <= w)
    if (S.length < 4) break
    C = S
  }
  const j = C.map(T => {
    const f = chieuH(y, T.s[0], T.s[1])
    return [T.d[0] - f[0], T.d[1] - f[1]] as Diem2
  })
  const J = C.length >= 6
  return {
    H: y,
    chieu: (T, f) => {
      const p = chieuH(y, T, f)
      if (!J) return p
      let M = 0, w = 0, S = 0
      for (let q = 0; q < C.length; q++) {
        const P = 1 / ((C[q].s[0] - T) ** 2 + (C[q].s[1] - f) ** 2 + 400)
        M += P; w += P * j[q][0]; S += P * j[q][1]
      }
      return [p[0] + w / M, p[1] + S / M]
    },
    khop: C.length, tong: c.moc.length,
    xoay180: v.xoay === 2,
    tl: tiLe(y, c.trang[0] / 2, c.trang[1] / 2),
  }
}

function trungVi(a: number[]): number {
  if (!a.length) return 0
  const c = a.slice().sort((o, e) => o - e)
  return c[c.length >> 1]
}

// ---------- vòng lấy mẫu ô tô ----------

const VONG_TO: [number, number][] = [[0, 0]]
for (const [a, c] of [[.3, 6], [.5, 10], [.66, 14]] as const)
  for (let o = 0; o < c; o++) VONG_TO.push([a, 2 * Math.PI * o / c + a])
const VONG16 = Array.from({ length: 16 }, (_, c) => 2 * Math.PI * c / 16)
const VONG12 = Array.from({ length: 12 }, (_, c) => 2 * Math.PI * c / 12)

// ---------- pipeline chính ----------

export function chamAnh(a: AnhRgba, c: Khuon, o: { canhMax?: number } = {}): KqOmr {
  const e = xam(a)
  const { anh: i, heSo: h } = thuNho(e, o.canhMax ?? 2e3)
  const s = chuanNen(i)
  let u: LoiCham | undefined
  for (const m of NGUONG) {
    try {
      return chamMot(i, s, h, c, gomDom(s, m.nguong, m.nenSang))
    } catch (x) {
      if (!(x instanceof LoiCham)) throw x
      u ??= x as LoiCham
    }
  }
  throw u
}

type KhuonKhac = [string, [number, number][][]]

type ONoi = {
  p: Diem2; r: number; loai: string; khoi: number
  dam: number; dinh: number; phu: number; vien: number; vienGan: number
  sangGoc: number; damTru: number; vs: number[]; net: boolean; tt: string
  img: Diem2
}

function chamMot(a: AnhXam, c: AnhXam, o: number, e: Khuon, i: Dom[]): KqOmr {
  // danh sách ô dùng chấm điểm chọn H
  const h: [number, number, number][] = [
    ...e.sbd.flat().map(([t, n]): [number, number, number] => [t, n, e.rk?.sbd ?? e.r]),
    ...e.ma.flat().map(([t, n]): [number, number, number] => [t, n, e.rk?.ma ?? e.r]),
    ...e.p1.flatMap(t => t.o).map(([t, n]): [number, number, number] => [t, n, e.rk?.p1 ?? e.r]),
    ...e.p2.flatMap(t => t.y.flat()).map(([t, n]): [number, number, number] => [t, n, e.rk?.p2 ?? e.r]),
    ...e.p3.flatMap(t => t.c.flatMap(n => n.so)).map(([t, n]): [number, number, number] => [t, n, e.rk?.p3 ?? e.r]),
  ]
  const s = Math.max(1, Math.floor(h.length / 90))
  const u = h.filter((_, n) => n % s === 0)
  const m = Array.from({ length: 8 }, (_, n) => 2 * Math.PI * n / 8)
  const x = (t: H9) => {
    let n = 0
    for (const [l, k, D] of u)
      for (const _ of m) {
        const N = (Q: number) => {
          const b = chieuH(t, l + Q * Math.cos(_), k + Q * Math.sin(_))
          return 1 - mau(c, b[0], b[1]) / 255
        }
        n += N(D) - .5 * (N(.7 * D) + N(1.4 * D))
      }
    return n / (u.length * 8)
  }
  const g = nanPhieu(i, e, [c.w, c.h], x)
  const r: ONoi[] = []
  const A = (t: string) => e.rk?.[t === 'tru' || t === 'phay' ? 'p3' : t] ?? e.r
  const d = (t: Diem2, n: string, l: number) => (
    r.push({
      p: t, r: A(n), loai: n, khoi: l,
      dam: 0, dinh: 0, phu: 0, vien: 0, vienGan: 0, sangGoc: 0, damTru: 0,
      vs: [], net: false, tt: 'trong', img: [0, 0],
    }), r.length - 1)
  let v = 0
  const y = e.sbd.map(t => t.map(n => d(n, 'sbd', v)))
  v++
  const C = e.ma.map(t => t.map(n => d(n, 'ma', v)))
  v++
  const khacKhuon = (e.khac ?? []) as unknown as KhuonKhac[]
  const j = khacKhuon.map(([, t]) => {
    const n = t.map(l => l.map(k => d(k, 'khac', v)))
    v++
    return n
  })
  const J = new Map<number, number>()
  const $ = e.p1.map(t => {
    const n = Math.round(t.o[0][0] / 6)
    if (!J.has(n)) J.set(n, v++)
    return t.o.map(l => d(l, 'p1', J.get(n)!))
  })
  const T = e.p2.map(t => {
    const n = v++
    return t.y.map(([l, k]) => [d(l, 'p2', n), d(k, 'p2', n)])
  })
  const f = e.p3.map(t => {
    const n = v++
    return t.c.map(l => ({
      so: l.so.map(k => d(k, 'p3', n)),
      tru: l.tru ? d(l.tru, 'tru', n) : undefined,
      phay: l.phay ? d(l.phay, 'phay', n) : undefined,
    }))
  })
  // nhóm ô theo khối để căn lưới riêng
  const p = new Map<number, number[]>()
  r.forEach((t, n) => {
    const l = p.get(t.khoi) ?? []
    l.push(n); p.set(t.khoi, l)
  })
  const M = (t: number, n: number) => 1 - mau(c, t, n) / 255
  for (const t of p.values()) {
    const n = r[t[0]].r
    const l = r[t[0]].loai === 'sbd' || r[t[0]].loai === 'ma'
    const k = t.reduce((G, O) => G + r[O].p[0], 0) / t.length
    const D = t.reduce((G, O) => G + r[O].p[1], 0) / t.length
    const _ = g.chieu(k, D), N = g.chieu(k + 1, D), Q = g.chieu(k, D + 1)
    const b = [N[0] - _[0], Q[0] - _[0], N[1] - _[1], Q[1] - _[1]]
    const U = t.map(G => g.chieu(r[G].p[0], r[G].p[1]))
    const V = (G: Diem2, O: number, F: number, I: number, B: number) => {
      const R = O + I * Math.cos(B), z = F + I * Math.sin(B)
      return M(G[0] + b[0] * R + b[1] * z, G[1] + b[2] * R + b[3] * z)
    }
    let tt = U
    if (!l && U.length >= 4) {
      const G = U.map(I => (M(I[0], I[1]) + VONG12.reduce((B, R) => B + V(I, 0, 0, .45 * n, R), 0) / VONG12.length) / 2)
      const O = [...G].sort((I, B) => I - B)[Math.floor(G.length / 4)]
      const F = U.filter((_, B) => G[B] < O + .25)
      if (F.length >= Math.max(2, U.length / 4)) tt = F
    }
    const ft = (G: number, O: number) => {
      let F = 0
      const I = new Array(VONG12.length)
      for (const B of tt) {
        VONG12.forEach((R, z) => {
          I[z] = V(B, G, O, n, R) - .5 * (V(B, G, O, .72 * n, R) + V(B, G, O, (l ? 1.2 : 1.4) * n, R))
        })
        if (!l) { F += I.reduce((R, z) => R + z, 0); continue }
        I.sort((R, z) => R - z); F += 6 * (I[5] + I[6])
      }
      return F - .0015 * tt.length * (G * G + O * O)
    }
    let ut = -1e9, nt = 0, ot = 0
    const Lt = (G: number) => {
      for (let O = -G; O <= G + .01; O += .8)
        for (let F = -G; F <= G + .01; F += .8) {
          const I = ft(F, O)
          if (I > ut) { ut = I; nt = F; ot = O }
        }
    }
    const Ot = () => {
      const [G, O] = [nt, ot]
      for (let F = O - .4; F <= O + .41; F += .4)
        for (let I = G - .4; I <= G + .41; I += .4) {
          if (I === G && F === O) continue
          const B = ft(I, F)
          if (B > ut) { ut = B; nt = I; ot = F }
        }
    }
    Lt(1.6); Ot()
    if (!l && ut < .3 * tt.length) { Lt(4); Ot() }
    t.forEach((G, O) => {
      const F = U[O], I = r[G]
      I.img = [F[0] + b[0] * nt + b[1] * ot, F[1] + b[2] * nt + b[3] * ot]
      let B = 0, R = 0
      const z: number[] = []
      for (const [Y, Z] of VONG_TO) {
        const ct = V(F, nt, ot, Y * n, Z)
        B += ct; z.push(ct)
        if (ct > .35) R++
      }
      z.sort((Y, Z) => Y - Z)
      I.dam = B / VONG_TO.length; I.phu = R / VONG_TO.length
      I.dinh = z[Math.floor(z.length * .8)]; I.vs = z
      let Nt = 0
      for (const Y of VONG16) {
        const Z = nt + 1.4 * n * Math.cos(Y), ct = ot + 1.4 * n * Math.sin(Y)
        Nt += mau(a, F[0] + b[0] * Z + b[1] * ct, F[1] + b[2] * Z + b[3] * ct)
      }
      const _t = (Y: number, Z: number) => {
        const ct = VONG16.map(gt => V(F, Y, Z, n, gt) - V(F, Y, Z, 1.4 * n, gt)).sort((gt, bt) => gt - bt)
        const $t = l ? ct.slice(4) : ct
        return $t.reduce((gt, bt) => gt + bt, 0) / $t.length
      }
      I.vien = _t(nt, ot); I.sangGoc = Nt / VONG16.length; I.vienGan = I.vien
      if (I.vien < .06)
        for (const Y of [-.4, -.2, 0, .2, .4])
          for (const Z of [-.4, -.2, 0, .2, .4])
            if (Z || Y) I.vienGan = Math.max(I.vienGan, _t(nt + Z * n, ot + Y * n))
    })
  }
  // ngưỡng nền theo loại ô
  const w = new Map<string, number>()
  for (const t of ['sbd', 'ma', 'khac', 'p1', 'p2', 'p3', 'tru', 'phay']) {
    const n = r.filter(l => l.loai === t).map(l => l.dam).sort((l, k) => l - k)
    if (n.length >= 20) w.set(t, n[Math.floor(n.length * .3)])
  }
  for (const t of ['tru', 'phay', 'khac', 'ma', 'sbd'])
    if (!w.has(t)) {
      const n = r.filter(l => l.loai === t).map(l => l.dam).sort((l, k) => l - k)
      if (n.length) w.set(t, Math.min(n[0], w.get('p3') ?? w.get('p1') ?? n[0]))
    }
  const S = (t: number, n: number) => Math.max(0, (t - n) / Math.max(.3, 1 - n))
  for (const t of r) {
    const n = w.get(t.loai) ?? 0
    t.damTru = S(t.dam, n)
    if (n > .05) {
      const l = n + .35 * (1 - n)
      t.phu = t.vs.filter(k => k > l).length / t.vs.length
    }
  }
  const q = new Map<string, number>()
  for (const t of w.keys()) {
    const n = r.filter(l => l.loai === t).map(l => l.dinh - l.dam).sort((l, k) => l - k)
    if (n.length >= 20) q.set(t, n[n.length >> 1])
  }
  const P = [
    ...y, ...C, ...$, ...T.flat(),
    ...f.flatMap(t => t.map(n => [...n.so, ...(n.tru !== undefined ? [n.tru] : []), ...(n.phay !== undefined ? [n.phay] : [])])),
  ].map(t => Math.max(...t.map(n => r[n].damTru))).filter(t => t > .22).sort((t, n) => t - n)
  const H = P.length >= 3 ? P[P.length >> 1] : .6
  const hs = (e as { heSoNguong?: number }).heSoNguong ?? 1
  const et = Math.max(.25 * hs, Math.min(.45, .55 * H * hs))
  const K = Math.max(.15 * hs, Math.min(.3, .36 * H * hs))
  const W = .05
  const L = new Map<string, number>(), st = new Map<string, number>()
  for (const t of w.keys()) {
    const n = r.filter(l => l.loai === t && l.damTru < W).map(l => l.vien).sort((l, k) => l - k)
    L.set(t, n.length ? n[Math.floor(n.length * .75)] : .2)
    st.set(t, n.length ? n[Math.floor(n.length * .9)] : .2)
  }
  const ht = r.map(t => t.sangGoc).sort((t, n) => t - n)
  const X = ht[ht.length >> 1] ?? 255
  const yt = Math.max(250, X + .6 * (255 - X))
  const it = (t: ONoi) => t.vienGan < .12 * (L.get(t.loai) ?? .2)
  const kt = (t: ONoi) => (t.sangGoc >= Math.min(yt, 245) && t.vienGan < .5 * (st.get(t.loai) ?? .2)) || it(t)
  const St = (t: ONoi) => (t.sangGoc >= 245 && t.vienGan < .8 * (st.get(t.loai) ?? .2)) || it(t)
  for (const t of r) {
    const n = (t.net = S(t.dinh, w.get(t.loai) ?? 0) >= Math.max(.4, .7 * H) || t.phu >= .15 ||
      t.dinh - t.dam - Math.max(0, (q.get(t.loai) ?? .015) - .015) >= .07)
    t.tt = t.damTru >= et ? 'to'
      : t.damTru >= K || (t.damTru >= W && n) ? 'nghi'
      : t.damTru >= W ? (St(t) ? 'nghi' : 'tay')
      : (kt(t) ? 'nghi' : 'trong')
  }
  const Dt = (t: number[]) => {
    const n = t.map(k => r[k].dam).sort((k, D) => k - D)
    const l = t.length >= 8 ? n[Math.floor(n.length * .3)] : n[0]
    for (const k of t) if (r[k].tt === 'tay' && S(r[k].dam, l) < W && !r[k].net) r[k].tt = 'trong'
  }
  for (const t of [y, C])
    if (t.length >= 2)
      for (let n = 0; n < t[0].length; n++) Dt(t.map(l => l[n]).filter(l => l !== undefined))
  if ($.length >= 8)
    for (let t = 0; t < Math.max(...$.map(n => n.length)); t++)
      Dt($.map(n => n[t]).filter(n => n !== undefined))
  const pt = (t: number[]) => {
    if (t.length < 2) return
    const n = Math.min(...t.map(l => r[l].dam))
    for (const l of t) {
      const k = r[l]
      if ((k.tt === 'tay' || k.tt === 'nghi') && !k.net && !kt(k) && S(k.dam, n) < W) k.tt = 'trong'
    }
  }
  $.forEach(t => pt(t))
  T.forEach(t => t.forEach(n => pt(n)))
  f.forEach(t => {
    for (let n = 0; n < (t[0]?.so.length ?? 0); n++) pt(t.map(l => l.so[n]).filter(l => l !== undefined))
  })
  pt(f.flatMap(t => t.flatMap(n => (n.tru !== undefined ? [n.tru] : []))))
  pt(f.flatMap(t => t.flatMap(n => (n.phay !== undefined ? [n.phay] : []))))
  const Rt = (() => {
    const t = r.filter(n => n.damTru < W).map(n => n.vien).sort((n, l) => n - l)
    return t.length ? t[t.length >> 1] : .2
  })()
  const Ft = new Set<number>()
  // chỉ so khối lệch khi vành ô đủ rõ — phiếu in nhạt (vienToiThieu thấp) thì bỏ qua
  if (Rt > 3 * ((e as { vienToiThieu?: number }).vienToiThieu ?? .05))
    for (const [t, n] of p) {
      const l = n.filter(k => r[k].damTru < W && !kt(r[k])).map(k => r[k].vien).sort((k, D) => k - D)
      if (l.length >= 3 && l[l.length >> 1] < .35 * Rt) Ft.add(t)
    }
  const at: string[] = []
  const Mt = (t: number[], n: string, l: boolean) => {
    const k = t.filter(b => r[b].tt === 'to')
    let D = false
    if (k.length >= 2) {
      const b = Math.max(...k.map(V => r[V].damTru))
      const U = k.filter(V => r[V].damTru < .6 * b)
      if (U.length && U.length < k.length) { for (const V of U) r[V].tt = 'tay'; D = true }
      else if (l) D = true
    }
    const _ = t.filter(b => r[b].tt === 'to')
    if (_.length === 1) {
      const b = r[_[0]].damTru
      for (const U of t)
        if (r[U].tt === 'nghi' && !St(r[U]) && !r[U].net && r[U].damTru < Math.min(.45 * b, .25)) r[U].tt = 'tay'
    }
    const N = !t.some(b => r[b].tt === 'to') && t.some(b => r[b].tt === 'tay' && r[b].damTru >= .8 * K)
    const Q = D || N || t.some(b => r[b].tt === 'nghi' || Ft.has(r[b].khoi))
    if (Q) at.push(n)
    return { chon: t.filter(b => r[b].tt === 'to'), nghi: Q }
  }
  const lt = (t: number): ODoc => ({
    x: r[t].img[0] / o, y: r[t].img[1] / o,
    dam: +r[t].damTru.toFixed(3), sang: Math.round(r[t].sangGoc),
    vien: +r[t].vien.toFixed(3), tt: r[t].tt,
  })
  const vt = (t: number[][], n: string, l = true): DocCot | null => {
    if (!t.length) return null
    const k = at.length
    let D = '', _ = false
    t.forEach((N, Q) => {
      const b = Mt(N, `${n} cột ${Q + 1}`, true)
      if (b.chon.length === 1) D += String(N.indexOf(b.chon[0]))
      else { D += '?'; if (!b.nghi) at.push(`${n} cột ${Q + 1}`); _ = true }
      _ ||= b.nghi
    })
    if (!l) at.splice(k)
    return { s: D, nghi: _, o: t.map(N => N.map(lt)) }
  }
  const Qt = vt(y, 'SBD')
  const zt = vt(C, 'Mã đề')
  const Et = khacKhuon.map(([t], n) => ({ ten: t, ...vt(j[n], t.toUpperCase(), false) }))
    .filter((t): t is { ten: string } & DocCot => !!t.o)
  const Jt = e.p1.map((t, n) => {
    const l = Mt($[n], `Câu ${t.q}`, false)
    return {
      q: t.q,
      chon: l.chon.map(k => 'ABCDEFGH'[$[n].indexOf(k)]).join(''),
      nghi: l.nghi,
      o: $[n].map(lt),
    }
  })
  const Wt = e.p2.map((t, n) => {
    const l: string[] = [], k: boolean[] = []
    T[n].forEach((D, _) => {
      const N = Mt(D, `Câu II.${t.q}${'abcdefgh'[_]}`, true)
      l.push(N.chon.length === 1 ? (N.chon[0] === D[0] ? 'Đ' : 'S') : N.chon.length ? 'ĐS' : '')
      k.push(N.nghi)
    })
    return { q: t.q, y: l, nghi: k, o: T[n].map(([D, _]) => [lt(D), lt(_)]) }
  })
  const Xt = e.p3.map((t, n) => {
    let l = '', k = false
    const D = `Câu III.${t.q}`, _ = at.length
    f[n].forEach((b) => {
      const V = [...b.so, ...(b.tru !== undefined ? [b.tru] : []), ...(b.phay !== undefined ? [b.phay] : [])]
      const tt = Mt(V, D, true)
      k ||= tt.nghi
      if (tt.chon.length === 1) {
        const ft = tt.chon[0]
        l += ft === b.tru ? '-' : ft === b.phay ? ',' : String(b.so.indexOf(ft))
      } else l += tt.chon.length ? '?' : ' '
    })
    at.splice(_, at.length - _)
    const N = l.trim()
    const Q = /^-?\d+(,\d+)?$/.test(N) || N === ''
    if (!Q || l.includes('?')) k = true
    if (k) at.push(D)
    return {
      q: t.q, s: N.replace(/\s+/g, ''), hopLe: Q, nghi: k,
      o: f[n].map(b => ({
        so: b.so.map(lt),
        tru: b.tru !== undefined ? lt(b.tru) : undefined,
        phay: b.phay !== undefined ? lt(b.phay) : undefined,
      })),
    }
  })
  const Pt = r.map(t => t.vien).sort((t, n) => t - n)
  const Tt = r.filter(t => t.tt === 'trong' || t.tt === 'tay').map(t => t.vien).sort((t, n) => t - n)
  if (Tt.length > 10 && Tt[Tt.length >> 1] < ((e as { vienToiThieu?: number }).vienToiThieu ?? .05))
    throw new LoiCham('lech', 'Không nắn được phiếu cho khớp — hãy chụp lại, giữ phiếu phẳng và thấy đủ 4 góc')
  return {
    sbd: Qt, ma: zt, p1: Jt, p2: Wt, p3: Xt, nghi: at,
    ...(Et.length ? { khac: Et } : {}),
    chatLuong: {
      doNet: +(Pt[Pt.length >> 1] ?? 0).toFixed(3),
      khopMoc: g.khop, tongMoc: g.tong, xoay180: g.xoay180,
      nguong: +et.toFixed(3), damTo: +H.toFixed(3),
    },
    chieu: (t, n) => {
      const l = g.chieu(t, n)
      return [l[0] / o, l[1] / o]
    },
  }
}

// ---------- nắn ảnh đã chấm (lưu trữ) ----------

const TILE = 2

/** Nắn ảnh màu về trang khuôn (trả {w,h,d} RGBA — worker bọc ImageData/encode) */
export function nanAnh(a: Uint8ClampedArray | Uint8Array, c: number, o: number, e: Khuon, i: (x: number, y: number) => Diem2)
  : { w: number; h: number; d: Uint8ClampedArray } {
  const h = Math.round(e.trang[0] * TILE), s = Math.round(e.trang[1] * TILE)
  const u = 16, m = Math.ceil(h / u) + 1, x = Math.ceil(s / u) + 1
  const g = new Float32Array(m * x), r = new Float32Array(m * x)
  for (let v = 0; v < x; v++)
    for (let y = 0; y < m; y++) {
      const [C, j] = i(y * u / TILE, v * u / TILE)
      g[v * m + y] = C; r[v * m + y] = j
    }
  const d = new Uint8ClampedArray(h * s * 4)
  for (let v = 0; v < s; v++) {
    const y = Math.floor(v / u), C = (v - y * u) / u
    for (let j = 0; j < h; j++) {
      const J = Math.floor(j / u), $ = (j - J * u) / u
      const T = y * m + J, f = T + 1, p = T + m, M = p + 1
      const w = (g[T] * (1 - $) + g[f] * $) * (1 - C) + (g[p] * (1 - $) + g[M] * $) * C
      const S = (r[T] * (1 - $) + r[f] * $) * (1 - C) + (r[p] * (1 - $) + r[M] * $) * C
      const q = (v * h + j) * 4
      if (w < 0 || S < 0 || w >= c - 1 || S >= o - 1) {
        d[q] = d[q + 1] = d[q + 2] = 255; d[q + 3] = 255
        continue
      }
      const E = w | 0, P = S | 0, H = w - E, et = S - P
      const K = (P * c + E) * 4, W = K + c * 4
      for (let L = 0; L < 3; L++) d[q + L] = (a[K + L] * (1 - H) + a[K + 4 + L] * H) * (1 - et) + (a[W + L] * (1 - H) + a[W + 4 + L] * H) * et
      d[q + 3] = 255
    }
  }
  return { w: h, h: s, d }
}

// export nội bộ — ngam/nhan-dang workers dùng lại cùng pipeline
export const _noi = {
  xam, thuNho, chuanNen, timDom, gomDom, nanPhieu, homography, chamMot,
  mau, chieuH, tiLe, xepGoc, dienTich, trungVi, toHop, NGUONG, sangVongNgoai,
}
export type { Dom as _Dom }
