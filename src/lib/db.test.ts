import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { deleteDB } from 'idb'
import { dsBai, layBai, luuBai, xoaBai, dsPhieu, luuPhieu, xoaPhieu, layAnh, luuAnh, layMeta, datMeta, __dongDb } from './db'
import type { Bai, Phieu } from '../types'

const baiMau = (id: string, sua = 1): Bai => ({
  id, ten: 'Bài ' + id, mon: 'Toán', lop: ['10A1'],
  phieu: 'mau-x', khuon: 'k1',
  diem: {
    mau: 'toan-2025', soCau: { p1: 12, p2: 4, p3: 6 },
    p1: .25, p2: [0, .1, .25, .5, 1], p3: .5, tuLuan: 0,
    truP1: 0, lamTron: .05, boSo0Sau: true, nhanPhayDau: true,
  },
  dapAn: [], hocSinh: [], tao: 1, sua,
})

const phieuMau = (id: string, baiId: string, stt = 1): Phieu => ({
  id, baiId, stt, nguon: 'tep', luc: 1, ok: true, sua: {},
})

beforeEach(async () => {
  await __dongDb()
  await deleteDB('chamthi365')
})

describe('db', () => {
  it('luuBai → layBai round-trip', async () => {
    const b = baiMau('b1')
    await luuBai(b)
    expect(await layBai('b1')).toEqual(b)
    expect(await layBai('khong-co')).toBeUndefined()
  })

  it('dsBai sắp theo sua giảm dần', async () => {
    await luuBai(baiMau('b1', 5))
    await luuBai(baiMau('b2', 9))
    await luuBai(baiMau('b3', 1))
    expect((await dsBai()).map(b => b.id)).toEqual(['b2', 'b1', 'b3'])
  })

  it('xoaBai xoá bài và toàn bộ phiếu của bài', async () => {
    await luuBai(baiMau('b1'))
    await luuPhieu(phieuMau('p1', 'b1'))
    await luuPhieu(phieuMau('p2', 'b1'))
    await luuPhieu(phieuMau('p3', 'b2'))
    await xoaBai('b1')
    expect(await layBai('b1')).toBeUndefined()
    expect(await dsPhieu('b1')).toEqual([])
    expect((await dsPhieu('b2')).length).toBe(1)
  })

  it('dsPhieu lọc đúng baiId, sắp theo stt', async () => {
    await luuPhieu(phieuMau('p2', 'b1', 2))
    await luuPhieu(phieuMau('p1', 'b1', 1))
    await luuPhieu(phieuMau('p9', 'b9', 1))
    const ds = await dsPhieu('b1')
    expect(ds.map(p => p.id)).toEqual(['p1', 'p2'])
  })

  it('anh: luuAnh → layAnh round-trip', async () => {
    const blob = new Blob(['abc'], { type: 'image/webp' })
    await luuAnh('p1', blob)
    const anh = await layAnh('p1')
    expect(anh).toBeInstanceOf(Blob)
    expect(await anh!.text()).toBe('abc')
    expect(await layAnh('khong')).toBeUndefined()
  })

  it('meta: datMeta → layMeta', async () => {
    await datMeta('k1', { a: 1 })
    expect(await layMeta('k1')).toEqual({ a: 1 })
    expect(await layMeta('khong')).toBeUndefined()
  })
})
