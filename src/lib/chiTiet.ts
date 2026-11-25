// Dữ liệu "chi tiết từng câu" dùng chung: hiển thị trong app + vẽ vào ảnh xuất
import type { DapAn, DocCham } from '../types'
import type { KqDiem } from './diem'

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
