import type { MauPhieu, Khuon } from '../types'
import { dsMauQR, khuonQR } from './phieu-qr/render'

const VU = '/thu-vien/'
let _ml: Promise<MauPhieu[]> | null = null
const _khuon = new Map<string, Promise<Khuon>>()

/** Mục lục toàn bộ mẫu phiếu + mẫu QR Chamthi365 (cache sau lần tải đầu) */
export function mucLuc(): Promise<MauPhieu[]> {
  return (_ml ??= fetch(VU + 'muc-luc.json')
    .then(r => r.json())
    .then(j => [...(j.phieu as MauPhieu[]), ...dsMauQR()]))
}

export function khuon(id: string): Promise<Khuon> {
  const kq = khuonQR(id)
  if (kq) return Promise.resolve(kq)
  let k = _khuon.get(id)
  if (!k) {
    k = fetch(`${VU}khuon/${id}.json`).then(r => {
      if (!r.ok) throw new Error('Không tải được khuôn ' + id)
      return r.json() as Promise<Khuon>
    })
    _khuon.set(id, k)
  }
  return k
}

export const urlAnh = (m: MauPhieu) => `${VU}anh/${m.ma}.webp`
export const urlPhieuPdf = (m: MauPhieu) => `${VU}phieu/${m.ma}.pdf`
export const khuonDau = (m: MauPhieu) => m.khuon[0].khuon

export const laQM = (m: MauPhieu) => (m.tu ?? 'QM') === 'QM'

export function nhanHo(m: MauPhieu): string {
  return laQM(m) ? `QM · ${m.ho}` : m.ho
}

/** "Phần I 40 câu · Phần II 8 câu · Phần III 6 câu · SBD 6 số · mã đề 3 số · có phách" */
export function tomTat(m: MauPhieu): string {
  const phan = m.p2 || m.p3
    ? [m.p1 && `Phần I ${m.p1} câu`, m.p2 && `Phần II ${m.p2} câu`, m.p3 && `Phần III ${m.p3} câu`]
        .filter(Boolean).join(' · ')
    : m.p1 ? `${m.p1} câu trắc nghiệm` : 'Tờ tự luận'
  const sbd = m.so_sbd ? `SBD ${m.so_sbd} số` : 'không tô SBD'
  return `${phan} · ${sbd} · mã đề ${m.so_ma} số${m.phach ? ' · có phách' : ''}`
}

/** "40-08-06" hoặc "40 câu" */
export function nhanCau(m: MauPhieu): string {
  return m.p2 || m.p3
    ? [m.p1, m.p2, m.p3].map(x => String(x).padStart(2, '0')).join('-')
    : `${m.p1} câu`
}

export type LocMau = { ho?: string; soCau?: string; phach?: boolean; tu?: string; tim?: string }

export function locMau(ds: MauPhieu[], f: LocMau): MauPhieu[] {
  return ds.filter(m => {
    if (f.tu && (m.tu ?? 'QM') !== f.tu && !(f.tu === 'QM' && laQM(m))) return false
    if (f.ho && nhanHo(m) !== f.ho && m.ho !== f.ho) return false
    if (f.soCau && nhanCau(m) !== f.soCau) return false
    if (f.phach !== undefined && f.phach !== null && m.phach !== f.phach) return false
    if (f.tim) {
      const t = f.tim.toLowerCase()
      if (!m.ten.toLowerCase().includes(t) && !m.ho.toLowerCase().includes(t) && !nhanCau(m).includes(t)) return false
    }
    return true
  })
}

/** Họ phiếu theo thứ tự ưu tiên như app gốc */
export const HO_UU_TIEN = [
  'Bộ GD 2025 (CV 1239)', 'A4', 'Mã đề 4 số', 'Học sinh giỏi',
  'A4-50 Bộ GD', 'A5-50', 'A4-120', 'A4 Trắc nghiệm + Tự luận',
]

export function dsHo(ds: MauPhieu[]): string[] {
  const co = new Set(ds.map(m => m.ho))
  const uu = HO_UU_TIEN.filter(h => co.has(h))
  const con = [...co].filter(h => !HO_UU_TIEN.includes(h)).sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }))
  return [...uu, ...con]
}

export function dsSoCau(ds: MauPhieu[]): string[] {
  return [...new Set(ds.map(nhanCau))].sort((a, b) => a.localeCompare(b, 'vi', { numeric: true }))
}
