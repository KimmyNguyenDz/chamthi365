// Dữ liệu "chi tiết từng câu" + "nét chấm" dùng chung: hiển thị trong app + vẽ vào ảnh xuất
import type { DapAn, DocCham, Khuon, OCham } from '../types'
import { dinhDangDiem, type KqDiem } from './diem'

export type ChipCau = { txt: string; dung: boolean | null; daDung: string }
export type MucChiTiet = { tieu: string; chips: ChipCau[] }

const fmtDa = (x?: string) => (!x ? '' : x === '*' ? '∗' : x)

export function dsChiTiet(doc: DocCham, da: DapAn, diem: KqDiem): MucChiTiet[] {
  const muc: MucChiTiet[] = []
  if (doc.p1.length) muc.push({
    tieu: `Phần I — đúng ${diem.p1.filter(x => x.dung === true).length}/${doc.p1.length} câu`,
    chips: doc.p1.map((g, v) => ({ txt: `${v + 1}.${g || '—'}`, dung: diem.p1[v]?.dung ?? null, daDung: fmtDa(da.p1[v]) })),
  })
  if (doc.p2.length) muc.push({
    tieu: `Phần II — đúng ${diem.p2.reduce((n, x) => n + x.y.filter(Boolean).length, 0)}/${doc.p2.length * 4} ý`,
    chips: doc.p2.flatMap((g, v) => [0, 1, 2, 3].map(i => ({
      txt: `${v + 1}${'abcd'[i]}:${g[i] || '—'}`, dung: diem.p2[v]?.y[i] ?? null, daDung: da.p2[v]?.[i] ?? '',
    }))),
  })
  if (doc.p3.length) muc.push({
    tieu: `Phần III — đúng ${diem.p3.filter(x => x.dung === true).length}/${doc.p3.length} câu`,
    chips: doc.p3.map((g, v) => ({ txt: `${v + 1}.${g || '—'}`, dung: diem.p3[v]?.dung ?? null, daDung: fmtDa(da.p3[v]) })),
  })
  return muc
}

/** Một nét chấm trên phiếu: cham=chấm tròn · vong=vòng xanh đáp án · chu=chữ đỏ (đáp số / điểm phần) */
export type NetCham =
  | { k: 'cham'; x: number; y: number; r: number; dung: boolean }
  | { k: 'vong'; x: number; y: number; r: number }
  | { k: 'chu'; x: number; y: number; r: number; txt: string; neo: 'trai' | 'giua' | 'phai' }

/**
 * Nét bút chữa theo khuôn: chấm xanh ô tô đúng, chấm đỏ ô tô sai + vòng xanh ô đáp án,
 * P.III sai ghi đáp số giữa dưới lưới câu, điểm từng phần ghi đỏ cạnh tiêu đề PHẦN.
 */
export function dsCham(os: OCham[], khuon: Khuon, doc: DocCham, da: DapAn, diem: KqDiem): NetCham[] {
  const nets: NetCham[] = []
  const r = (khuon.r ?? 3.4) * 1.7
  const [W, H] = khuon.trang
  const trongKhuon = (o: OCham) => o.x > 0 && o.x < W && o.y > 0 && o.y < H
  const kpos = (phan: 'p1' | 'p2' | 'p3', q: number, i: number): [number, number] | null => {
    if (phan === 'p1') return khuon.p1[q - 1]?.o[i] ?? null
    if (phan === 'p2') return khuon.p2[q - 1]?.y[i >> 1]?.[i & 1] ?? null
    const ci = Math.floor(i / 12), j = i % 12, col = khuon.p3[q - 1]?.c[ci]
    return !col ? null : j < 10 ? col.so[j] ?? null : j === 10 ? col.tru ?? null : col.phay ?? null
  }
  const pos = (phan: 'p1' | 'p2' | 'p3', q: number, i: number) => {
    const o = os.find(x => x.phan === phan && x.q === q && x.i === i)
    return o && trongKhuon(o) ? [o.x, o.y] as [number, number] : kpos(phan, q, i)
  }

  doc.p1.forEach((g, v) => {
    const dung = diem.p1[v]?.dung
    if (dung == null) return
    for (const ch of g) {
      const p = pos('p1', v + 1, 'ABCDEFGH'.indexOf(ch))
      if (p) nets.push({ k: 'cham', x: p[0], y: p[1], r, dung })
    }
    if (!dung) for (const ch of da.p1[v] ?? '') {
      if (ch === '*') continue
      const p = pos('p1', v + 1, 'ABCDEFGH'.indexOf(ch))
      if (p) nets.push({ k: 'vong', x: p[0], y: p[1], r })
    }
  })

  doc.p2.forEach((g, v) => {
    for (let y = 0; y < 4; y++) {
      const dung = diem.p2[v]?.y[y]
      if (dung == null) continue
      const chon = g[y]
      if (chon === 'Đ' || chon === 'ĐS') {
        const p = pos('p2', v + 1, y * 2)
        if (p) nets.push({ k: 'cham', x: p[0], y: p[1], r, dung })
      }
      if (chon === 'S' || chon === 'ĐS') {
        const p = pos('p2', v + 1, y * 2 + 1)
        if (p) nets.push({ k: 'cham', x: p[0], y: p[1], r, dung })
      }
      const dungDa = da.p2[v]?.[y]
      if (!dung && (dungDa === 'Đ' || dungDa === 'S')) {
        const p = pos('p2', v + 1, y * 2 + (dungDa === 'Đ' ? 0 : 1))
        if (p) nets.push({ k: 'vong', x: p[0], y: p[1], r })
      }
    }
  })

  doc.p3.forEach((g, v) => {
    const dung = diem.p3[v]?.dung
    if (dung == null) return
    for (const o of os.filter(x => x.phan === 'p3' && x.q === v + 1 && x.to && trongKhuon(x)))
      nets.push({ k: 'cham', x: o.x, y: o.y, r, dung })
    if (!dung) {
      const daSo = da.p3[v]
      const cols = khuon.p3[v]?.c
      if (!daSo || daSo === '*' || !cols?.length) return
      // đáp số giữa dưới lưới của chính câu đó — không lệch sang câu kế
      const xGiua = (cols[0].so[0][0] + cols[cols.length - 1].so[0][0]) / 2
      nets.push({ k: 'chu', x: xGiua, y: cols[0].so[9][1] + r * 2.6, r, txt: `→ ${daSo}`, neo: 'giua' })
    }
  })

  // Điểm từng phần ghi đỏ ở mép phải, ngang hàng tiêu đề PHẦN
  const hop = (pts: ([number, number] | undefined | null)[]) => {
    const p = pts.filter((x): x is [number, number] => !!x)
    return p.length ? { x1: Math.max(...p.map(x => x[0])), y0: Math.min(...p.map(x => x[1])), y1: Math.max(...p.map(x => x[1])) } : null
  }
  const b1 = hop(khuon.p1.flatMap(q => q.o))
  const b2 = hop(khuon.p2.flatMap(q => q.y.flat(1) as [number, number][]))
  const b3 = hop(khuon.p3.flatMap(q => q.c.flatMap(col => [col.tru ?? null, col.phay ?? null, ...col.so])))
  const diemPhan = (b: { x1: number; y0: number; y1: number } | null, yTren: number, d: number) => {
    if (!b) return
    const y = yTren > 0 ? (yTren + b.y0) / 2 : b.y0 - r * 6.5
    nets.push({ k: 'chu', x: Math.min(b.x1 + r * 8, W - 8), y, r, txt: `${dinhDangDiem(d)}đ`, neo: 'phai' })
  }
  diemPhan(b1, 0, diem.phan.p1)
  diemPhan(b2, b1?.y1 ?? 0, diem.phan.p2)
  diemPhan(b3, b2?.y1 ?? 0, diem.phan.p3)
  return nets
}
