import { dsPhieu, luuPhieu, xoaPhieu } from './db'
import { idMoi } from './id'
import type { KqMay } from './mayCham'
import type { Bai, Phieu } from '../types'

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
  return { phieu, thay }
}
