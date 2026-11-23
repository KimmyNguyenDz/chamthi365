import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Bai, Phieu, HangCho } from '../types'

interface C365DB extends DBSchema {
  bai: { key: string; value: Bai }
  phieu: { key: string; value: Phieu; indexes: { baiId: string } }
  anh: { key: string; value: Blob }
  hang: { key: string; value: HangCho }
  meta: { key: string; value: unknown }
}

let _db: Promise<IDBPDatabase<C365DB>> | null = null
export function moDb(): Promise<IDBPDatabase<C365DB>> {
  return (_db ??= openDB<C365DB>('chamthi365', 1, {
    upgrade(db) {
      db.createObjectStore('bai', { keyPath: 'id' })
      const p = db.createObjectStore('phieu', { keyPath: 'id' })
      p.createIndex('baiId', 'baiId')
      db.createObjectStore('anh')
      db.createObjectStore('hang', { keyPath: 'khoa' })
      db.createObjectStore('meta')
    },
  }))
}

/** Chỉ cho test: đóng connection để deleteDB không treo */
export async function __dongDb() {
  if (_db) { (await _db).close(); _db = null }
}

// pub-sub: các màn đăng ký để refresh khi dữ liệu đổi
const _nghe = new Set<() => void>()
let _hen: ReturnType<typeof setTimeout> | 0 = 0
export function baoThayDoi() {
  if (_hen) return
  _hen = setTimeout(() => {
    _hen = 0
    _nghe.forEach(f => f())
  }, 150)
}
export function dangKyThayDoi(fn: () => void): () => void {
  _nghe.add(fn)
  return () => { _nghe.delete(fn) }
}

export async function dsBai(): Promise<Bai[]> {
  const ds = await (await moDb()).getAll('bai')
  return ds.sort((a, b) => b.sua - a.sua)
}
export const layBai = (id: string) => (moDb().then(d => d.get('bai', id)) as Promise<Bai | undefined>)
export async function luuBai(b: Bai, o: { dongBo?: boolean } = {}) {
  const d = await moDb()
  await d.put('bai', b)
  if (o.dongBo !== false) await ghiHang({ khoa: `bai:${b.id}`, loai: 'bai', id: b.id, luc: Date.now() })
  baoThayDoi()
}
export async function xoaBai(id: string, o: { dongBo?: boolean } = {}) {
  const d = await moDb()
  const ds = await d.getAllFromIndex('phieu', 'baiId', id)
  const t = d.transaction(['bai', 'phieu', 'anh', 'hang'], 'readwrite')
  t.objectStore('bai').delete(id)
  for (const p of ds) {
    t.objectStore('phieu').delete(p.id)
    t.objectStore('anh').delete(p.id)
    t.objectStore('hang').delete(`anh:${p.id}`)
    t.objectStore('hang').delete(`phieu:${p.id}`)
    if (o.dongBo !== false) t.objectStore('hang').put({ khoa: `xoaPhieu:${p.id}`, loai: 'xoaPhieu', id: p.id, baiId: id, luc: Date.now() })
  }
  t.objectStore('hang').delete(`bai:${id}`)
  if (o.dongBo !== false) t.objectStore('hang').put({ khoa: `xoaBai:${id}`, loai: 'xoaBai', id, luc: Date.now() })
  await t.done
  baoThayDoi()
}

export async function dsPhieu(baiId: string): Promise<Phieu[]> {
  const ds = await (await moDb()).getAllFromIndex('phieu', 'baiId', baiId)
  return ds.sort((a, b) => a.stt - b.stt)
}
export const layPhieu = (id: string) => (moDb().then(d => d.get('phieu', id)) as Promise<Phieu | undefined>)
export async function luuPhieu(p: Phieu, o: { dongBo?: boolean } = {}) {
  await (await moDb()).put('phieu', p)
  if (o.dongBo !== false) await ghiHang({ khoa: `phieu:${p.id}`, loai: 'phieu', id: p.id, baiId: p.baiId, luc: Date.now() })
  baoThayDoi()
}
export async function xoaPhieu(id: string, o: { dongBo?: boolean } = {}) {
  const d = await moDb()
  const t = d.transaction(['phieu', 'anh', 'hang'], 'readwrite')
  t.objectStore('phieu').delete(id)
  t.objectStore('anh').delete(id)
  t.objectStore('hang').delete(`anh:${id}`)
  t.objectStore('hang').delete(`phieu:${id}`)
  if (o.dongBo !== false) t.objectStore('hang').put({ khoa: `xoaPhieu:${id}`, loai: 'xoaPhieu', id, luc: Date.now() })
  await t.done
  baoThayDoi()
}

export const layAnh = (khoa: string) => (moDb().then(d => d.get('anh', khoa)) as Promise<Blob | undefined>)
export async function luuAnh(khoa: string, blob: Blob, o: { dongBo?: boolean } = {}) {
  await (await moDb()).put('anh', blob, khoa)
  if (o.dongBo !== false) await ghiHang({ khoa: `anh:${khoa}`, loai: 'anh', id: khoa, luc: Date.now() })
}

export const layMeta = (k: string) => moDb().then(d => d.get('meta', k))
export const datMeta = (k: string, v: unknown) => moDb().then(d => d.put('meta', v, k).then(() => {}))

// hàng đợi đồng bộ
export const dsHang = () => moDb().then(d => d.getAll('hang') as Promise<HangCho[]>)
export const ghiHang = (h: HangCho) => moDb().then(d => d.put('hang', h).then(() => {}))
export const xoaHang = (khoa: string) => moDb().then(d => d.delete('hang', khoa))
