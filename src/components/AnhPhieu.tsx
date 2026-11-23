import { useEffect, useMemo, useState } from 'react'
import type { KqCham, OCham } from '../types'

export const MAU_O: Record<OCham['trangThai'], string> = {
  dung: '#36c46b', sai: '#ef4b55', mo: '#ff9a3d', xam: '#9aa0bd',
  tay: '#3a8ef0', trung: '#ffcf3f', trong: '#d5daea',
}

/**
 * Ảnh phiếu đã nắn + overlay SVG các ô đã đọc.
 * xanh=đúng · đỏ=sai · cam=cần xem · lam=sửa tay · vàng=trùng
 * Bấm vào ô → onBam(o).
 */
export function AnhPhieu({ anh, kq, trang, can, onBam }: {
  anh: Blob | null
  kq: KqCham
  trang: [number, number]
  can: Set<string>
  onBam?: (o: OCham) => void
}) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    if (!anh) { setUrl(''); return }
    const u = URL.createObjectURL(anh)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [anh])

  const [w, h] = trang
  return (
    <div style={{ position: 'relative', border: 'var(--bo)', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
      {url
        ? <img src={url} alt="Phiếu đã nắn" style={{ display: 'block', width: '100%' }} draggable={false} />
        : <div className="giua mo" style={{ padding: 60 }}>Không có ảnh nắn — phiếu này chấm bằng bản cũ</div>}
      <svg viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {kq.o.map((o, i) => {
          const khoa = `${o.phan}:${o.q ?? ''}:${o.i ?? ''}`
          const cam = can.has(khoa)
          const mau = cam ? 'var(--orange)' : MAU_O[o.trangThai]
          return (
            <circle key={i} cx={o.x} cy={o.y} r={(o.r ?? 8) * 1.6}
              fill={o.to || cam ? mau : 'none'}
              fillOpacity={cam ? 0.55 : o.trangThai === 'trong' ? 0.25 : 0.7}
              stroke={mau} strokeWidth={Math.max(1.5, (o.r ?? 8) * 0.18)}
              style={{ cursor: onBam ? 'pointer' : 'default' }}
              onClick={onBam ? () => onBam(o) : undefined} />
          )
        })}
      </svg>
    </div>
  )
}
