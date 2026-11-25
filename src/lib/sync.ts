// Đồng bộ 2 chiều Supabase + up ảnh Drive — theo cơ chế queue `hang` + mốc meta như app gốc
import { sb, laySession, providerToken } from './supabase'
import { layThuMuc, taiLen } from './drive'
import {
  dsHang, xoaHang, layBai, luuBai, xoaBai, layPhieu, luuPhieu, xoaPhieu,
  layLop, luuLop, xoaLop,
  layAnh, layMeta, datMeta, moDb, dangKyThayDoi,
} from './db'
import type { Bai, Lop, Phieu, HangCho } from '../types'

const T_BAI = 'cp_bai'
const T_PHIEU = 'cp_phieu'
const T_LOP = 'cp_lop'
const T_META = 'cp_meta'

let _dangChay = false

/** Push hàng đợi → pull thay đổi về. Trả {day, keo} số bản ghi */
export async function dongBo(): Promise<{ day: number; keo: number }> {
  if (_dangChay) return { day: 0, keo: 0 }
  _dangChay = true
  try {
    const s = await laySession()
    if (!s) throw new Error('Chưa đăng nhập')
    const uid = s.user.id
    const token = providerToken(s)
    const cli = sb()
    let day = 0, keo = 0

    // ---- push queue ----
    let thuMuc: string | null = null
    const hang = (await dsHang()).sort((a, b) => a.luc - b.luc)
    for (const h of hang) {
      await dayLen(cli, uid, h, async () => {
        // ảnh → Drive (cần provider_token còn hạn)
        if (!token) return false
        thuMuc ??= (await layThuMuc(token)).id
        const bl = await layAnh(h.id)
        if (bl) await taiLen(token, thuMuc, `${h.id}.webp`, bl)
        return true
      }) && day++
    }

    // ---- pull cp_bai ----
    keo += await keoVe<Bai>(cli, uid, T_BAI, `moc:${uid}:${T_BAI}`, async (row, xoa) => {
      if (xoa) await xoaBai(row.id, { dongBo: false })
      else await luuBai({ ...row.data, sua: Date.now() }, { dongBo: false })
    })
    // ---- pull cp_phieu ----
    keo += await keoVe<Phieu>(cli, uid, T_PHIEU, `moc:${uid}:${T_PHIEU}`, async (row, xoa) => {
      if (xoa) await xoaPhieu(row.id, { dongBo: false })
      else await luuPhieu(row.data as Phieu, { dongBo: false })
    })
    // ---- pull cp_lop ----
    keo += await keoVe<Lop>(cli, uid, T_LOP, `moc:${uid}:${T_LOP}`, async (row, xoa) => {
      if (xoa) await xoaLop(row.id, { dongBo: false })
      else await luuLop(row.data as Lop, { dongBo: false })
    })
    // ---- pull cp_meta (cài đặt cá nhân) ----
    keo += await keoVe<unknown>(cli, uid, T_META, `moc:${uid}:${T_META}`, async (row, xoa) => {
      if (!xoa) await datMeta(row.id, row.data)
    })

    return { day, keo }
  } finally { _dangChay = false }
}

async function dayLen(cli: ReturnType<typeof sb>, uid: string, h: HangCho, upAnh: () => Promise<boolean>): Promise<boolean> {
  try {
    switch (h.loai) {
      case 'bai': {
        const b = await layBai(h.id)
        if (b) {
          const { error } = await cli.from(T_BAI).upsert({ id: b.id, uid, data: b, xoa: false, cap_nhat: new Date().toISOString() })
          if (error) throw error
        }
        break
      }
      case 'phieu': {
        const p = await layPhieu(h.id)
        if (p) {
          const { error } = await cli.from(T_PHIEU).upsert({ id: p.id, bai_id: p.baiId, uid, data: p, xoa: false, cap_nhat: new Date().toISOString() })
          if (error) throw error
        }
        break
      }
      case 'xoaBai': {
        const { error } = await cli.from(T_BAI).upsert({ id: h.id, uid, data: null, xoa: true, cap_nhat: new Date().toISOString() })
        if (error) throw error
        break
      }
      case 'xoaPhieu': {
        const { error } = await cli.from(T_PHIEU).upsert({ id: h.id, uid, data: null, xoa: true, cap_nhat: new Date().toISOString() })
        if (error) throw error
        break
      }
      case 'lop': {
        const l = await layLop(h.id)
        if (l) {
          const { error } = await cli.from(T_LOP).upsert({ id: l.id, uid, data: l, xoa: false, cap_nhat: new Date().toISOString() })
          if (error) throw error
        }
        break
      }
      case 'xoaLop': {
        const { error } = await cli.from(T_LOP).upsert({ id: h.id, uid, data: null, xoa: true, cap_nhat: new Date().toISOString() })
        if (error) throw error
        break
      }
      case 'meta': {
        const v = await layMeta(h.id)
        if (v !== undefined) {
          const { error } = await cli.from(T_META).upsert({ id: h.id, uid, data: v, xoa: false, cap_nhat: new Date().toISOString() })
          if (error) throw error
        }
        break
      }
      case 'anh': {
        if (!(await upAnh())) return false // chưa có token → giữ queue, lần sau up
        break
      }
    }
    await xoaHang(h.khoa)
    return true
  } catch {
    return false // offline/lỗi → giữ queue retry lần sau
  }
}

async function keoVe<T>(cli: ReturnType<typeof sb>, uid: string, table: string, khoaMoc: string,
  apDung: (row: { id: string; data: T }, xoa: boolean) => Promise<void>): Promise<number> {
  const moc = (await layMeta(khoaMoc)) as string | undefined
  let q = cli.from(table).select('id,data,xoa,cap_nhat').eq('uid', uid).order('cap_nhat')
  if (moc) q = q.gt('cap_nhat', moc)
  const { data, error } = await q
  if (error) throw error
  let n = 0
  for (const row of data ?? []) {
    await apDung(row as { id: string; data: T }, !!row.xoa)
    n++
  }
  if (data?.length) await datMeta(khoaMoc, data[data.length - 1].cap_nhat)
  return n
}

/** Đếm số việc còn chờ trong queue */
export const soViecCho = () => dsHang().then(h => h.length)

/** Tự đồng bộ debounced khi dữ liệu đổi (gọi 1 lần ở App) */
export function khoiDongSync() {
  let h: ReturnType<typeof setTimeout> | 0 = 0
  dangKyThayDoi(() => {
    if (h) clearTimeout(h)
    h = setTimeout(() => {
      if (navigator.onLine) dongBo().catch(() => { })
    }, 4000)
  })
  addEventListener('online', () => dongBo().catch(() => { }))
}

/** Dọn phiếu mồ côi (phieu không còn bai cha) — dùng khi pull về */
export async function donPhieuMoi() {
  const d = await moDb()
  const ps = await d.getAll('phieu') as Phieu[]
  const baiIds = new Set((await d.getAll('bai') as Bai[]).map(b => b.id))
  for (const p of ps) if (!baiIds.has(p.baiId)) await xoaPhieu(p.id, { dongBo: false })
}
