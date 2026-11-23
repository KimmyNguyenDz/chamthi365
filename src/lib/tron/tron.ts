// Trộn đề: hoán vị câu trong nhóm + phương án (tôn trọng ghim), cân ABCD
import type { Cau, De, Nhom, Pa, Phan } from './parse'
import type { DapAn } from '../../types'

export type CfgTron = {
  soDe: number
  maList: string[]          // danh sách mã đề
  canABCD: boolean          // cân số đáp án A/B/C/D ±1
  tronYP2: boolean          // trộn thứ tự ý a)–d) trong câu đúng/sai
  tronLoai: boolean         // trộn cả câu giữa các nhóm g0 (mặc định không)
}

const tronMang = <T,>(a: T[], rnd: () => number): T[] => {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

export function xaoTron(cfg: CfgTron, rnd: () => number = Math.random): { des: De[]; dapAn: DapAn[] } {
  return { des: [], dapAn: [] }
}

/** Trộn phương án 1 câu — ô ghim giữ nguyên vị trí, trả về chữ đáp án đúng mới */
function tronPa(c: Cau, muc: number, rnd: () => number): Cau {
  if (muc < 2 || !c.pa.length) return c
  const gim = c.pa.filter(p => p.gim)
  const roi = c.pa.filter(p => !p.gim)
  const x = tronMang(roi, rnd)
  const out: Pa[] = []
  let i = 0
  for (let k = 0; k < c.pa.length; k++) {
    out.push(c.pa[k].gim ? c.pa[k] : x[i++])
  }
  const CHU = 'ABCDEFGH'
  return { ...c, pa: out.map((p, k) => ({ ...p, chu: CHU[k] })) }
}

/** Trộn câu trong 1 nhóm; muc 1 = chỉ đổi thứ tự câu, muc≥2 trộn cả PA, muc 3 thêm ý Đ/S */
function tronNhom(n: Nhom, rnd: () => number): Cau[] {
  const ds = n.khongTron ? n.cau : tronMang(n.cau, rnd)
  return ds.map(c => {
    let x = tronPa(c, n.muc, rnd)
    if (n.muc >= 3 && c.loai === 'ds' && x.y.length > 1) {
      const idx = tronMang([...x.y.keys()], rnd)
      x = { ...x, y: idx.map(i => x.y[i]) }
    }
    return x
  })
}

/** Số đáp án đúng theo chữ cái của 1 đề (chỉ câu tn) */
function demABCD(de: De): Record<string, number> {
  const dem: Record<string, number> = {}
  for (const p of de.phan) for (const n of p.nhom) for (const c of n.cau)
    if (c.loai === 'tn' && c.pa.length) {
      const d = c.pa.find(x => x.dung)
      if (d) dem[d.chu] = (dem[d.chu] ?? 0) + 1
    }
  return dem
}

const lech = (d: Record<string, number>) => {
  const v = ['A', 'B', 'C', 'D'].map(c => d[c] ?? 0)
  return Math.max(...v) - Math.min(...v)
}

export function tronDe(de: De, cfg: CfgTron, rnd: () => number = Math.random): { des: De[]; dapAn: DapAn[] } {
  const des: De[] = []
  const dapAn: DapAn[] = []
  for (let i = 0; i < cfg.soDe; i++) {
    const ma = cfg.maList[i] ?? String(101 + i)
    // thử trộn nhiều lần để cân ABCD khi bật
    let tot: De | null = null, totLech = 99
    for (let lan = 0; lan < (cfg.canABCD ? 60 : 1); lan++) {
      const moi: De = { dau: de.dau, phan: [], duoi: de.duoi, loi: [], canhBao: de.canhBao }
      for (const p of de.phan) {
        const np: Phan = { ...p, nhom: p.nhom.map(n => ({ ...n, cau: tronNhom(n, rnd) })) }
        moi.phan.push(np)
      }
      const l = lech(demABCD(moi))
      if (l < totLech) { tot = moi; totLech = l }
      if (l <= 1) break
    }
    const de2 = tot!
    des.push(de2)
    const da: DapAn = { ma, p1: [], p2: [], p3: [] }
    for (const p of de2.phan) for (const n of p.nhom) for (const c of n.cau) {
      if (c.loai === 'tn') da.p1.push(c.pa.find(x => x.dung)?.chu ?? '')
      else if (c.loai === 'ds') da.p2.push(c.y.join(''))
      else if (c.loai === 'tln') da.p3.push(c.dapSo ?? '')
    }
    dapAn.push(da)
  }
  return { des, dapAn }
}
