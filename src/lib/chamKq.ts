import { dsPhieu, luuAnh, luuPhieu, xoaPhieu } from './db'
import { idMoi } from './id'
import type { KqMay } from './mayCham'
import type { Bai, DocCham, Phieu } from '../types'

/** Áp sửa tay (`phieu.sua`) lên doc máy đọc → DocCham hiệu lực để chấm điểm */
export function docHieuLuc(p: Phieu): DocCham {
  const d = p.kq!.doc
  const s = p.sua ?? {}
  const doc: DocCham = { ...d, p1: [...d.p1], p2: d.p2.map(x => [...x]), p3: [...d.p3] }
  if (typeof s.sbd === 'string') { doc.sbd = s.sbd; doc.sbdNguon = 'tay' }
  if (typeof s.ma === 'string') { doc.ma = s.ma; doc.maNguon = 'tay' }
  const p1 = s.p1 as Record<number, string> | undefined
  if (p1) for (const [q, v] of Object.entries(p1)) doc.p1[+q] = v
  const p2 = s.p2 as Record<number, string> | undefined
  if (p2) for (const [q, v] of Object.entries(p2)) doc.p2[+q] = v.padEnd(4, ' ').split('')
  const p3 = s.p3 as Record<number, string> | undefined
  if (p3) for (const [q, v] of Object.entries(p3)) doc.p3[+q] = v
  return doc
}

export const diemTuLuan = (p: Phieu): number => (p.sua?.tuLuan as number) || 0

/** Kết quả mayCham → bản ghi Phieu; trùng SBD thì thay phiếu cũ (giữ tham chiếu sua.thayThe) */
export async function luuPhieuMoi(bai: Bai, r: KqMay, nguon: string, stt: number): Promise<{ phieu: Phieu; thay: boolean }> {
  const phieu: Phieu = {
    id: idMoi(), baiId: bai.id, stt, nguon, luc: Date.now(),
    ok: !!(r.ok && r.doc),
    kq: r.ok && r.doc ? { doc: r.doc, can: r.can ?? [], o: r.o ?? [], xoay180: r.xoay180 } : undefined,
    loi: r.ok ? undefined : (r.loi ?? 'Không đọc được'),
    sua: {},
  }
  let thay = false
  const sbdMoi = r.doc?.sbd?.replace(/^0+/, '')
  if (phieu.ok && sbdMoi) {
    for (const p of await dsPhieu(bai.id)) {
      if (p.ok && p.kq?.doc.sbd?.replace(/^0+/, '') === sbdMoi && p.id !== phieu.id) {
        await xoaPhieu(p.id)
        phieu.sua.thayThe = p.id
        thay = true
        break
      }
    }
  }
  await luuPhieu(phieu)
  if (r.anh) await luuAnh(phieu.id, r.anh)
  return { phieu, thay }
}
