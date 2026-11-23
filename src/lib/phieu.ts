import type { Phieu, DocCham, CanXem, Bai, HocSinh } from '../types'

const lay = <T>(sua: Record<string, unknown>, k: string, goc: T): T =>
  (sua[k] as T | undefined) ?? goc

/** Bài đọc hữu hiệu = kết quả máy + chỗ thầy sửa tay (sua: keys p1:q, p2:q:y, p3:q, sbd, ma, tuLuan) */
export function docHieuLuc(p: Phieu, boSbd = false): (DocCham & { can: CanXem[]; thua: string[]; tuLuan?: number }) | null {
  const s = p.kq
  if (!s) return null
  const sua = p.sua as Record<string, unknown> & { bo?: Record<string, boolean> }
  const bo = sua.bo ?? {}
  const can = s.can.filter(c => !bo[khoaCan(c)])
  const thua: string[] = []
  return {
    sbd: boSbd ? '' : lay(sua, 'sbd', s.doc.sbd),
    ma: lay(sua, 'ma', s.doc.ma),
    maNguon: sua.ma !== undefined ? 'tay' : s.doc.maNguon,
    sbdNguon: sua.sbd !== undefined ? 'tay' : s.doc.sbdNguon,
    p1: s.doc.p1.map((v, i) => (sua[`p1:${i + 1}`] as string) ?? v),
    p2: s.doc.p2.map((g, i) =>
      g.map((x, y) => (sua[`p2:${i + 1}:${y}`] as string) ?? x),
    ),
    p3: s.doc.p3.map((v, i) => (sua[`p3:${i + 1}`] as string) ?? v),
    khac: s.doc.khac,
    can,
    thua: (sua.thua as string[] | undefined) ?? thua,
    tuLuan: sua.tuLuan as number | undefined,
  }
}

export const khoaCan = (c: CanXem): string =>
  c.phan === 'p1' ? `p1:${c.q}` : c.phan === 'p2' ? `p2:${c.q}:${c.i}` : c.phan === 'p3' ? `p3:${c.q}` : c.phan ?? c.loai

const bo0 = (s: string) => s.replace(/^0+/, '')
export const timHocSinhSbd = (bai: Bai, sbd: string): HocSinh | undefined =>
  bai.hocSinh.find(h => bo0(h.sbd) === bo0(sbd))
