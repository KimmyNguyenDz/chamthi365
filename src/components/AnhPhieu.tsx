import { useEffect, useState } from 'react'
import type { CanXem, KqCham, OCham } from '../types'
import type { NetCham } from '../lib/chiTiet'

export const MAU_O: Record<OCham['trangThai'], string> = {
  dung: '#36c46b', sai: '#ef4b55', mo: '#ff9a3d', xam: '#9aa0bd',
  tay: '#3a8ef0', trung: '#ffcf3f', trong: '#d5daea',
}

const XANH = '#0a8a3e'
const DO = '#d21f30'

/** Ô trên phiếu có nằm trong chỗ cần xem không (so theo phan/q/i — p2: i ô = ý*2+cột ĐS) */
export const laCam = (o: OCham, can: CanXem[]): boolean =>
  can.some(c => c.phan === o.phan
    && (c.q === undefined || c.q === o.q)
    && (c.i === undefined || (o.phan === 'p2' ? Math.floor((o.i ?? 0) / 2) === c.i : c.i === o.i)))

/**
 * Ảnh phiếu đã nắn + nét chấm (nets: chấm xanh đúng / đỏ sai / vòng đáp án / chữ đỏ).
 * Không có nets (chưa có đáp án) → phủ màu các ô như cũ.
 * cam=chỗ cần xem (viền nhấp nháy). Bấm vào ô → onBam(o).
 */
export function AnhPhieu({ anh, kq, trang, can, nets, onBam }: {
  anh: Blob | null
  kq: KqCham
  trang: [number, number]
  can: CanXem[]
  nets?: NetCham[]
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
  const cham = nets && nets.length > 0
  return (
    <div style={{ position: 'relative', border: 'var(--bo)', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
      {url
        ? <img src={url} alt="Phiếu đã nắn" style={{ display: 'block', width: '100%' }} draggable={false} />
        : <div className="giua mo" style={{ padding: 60 }}>Không có ảnh nắn — phiếu này chấm bằng bản cũ</div>}
      <svg viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        {/* nét chấm bài chữa — vẽ dưới lớp ô bấm */}
        {nets?.map((n, i) => n.k === 'cham'
          ? <circle key={`n${i}`} cx={n.x} cy={n.y} r={n.r * 0.62} fill={n.dung ? XANH : DO} fillOpacity={0.85} />
          : n.k === 'vong'
            ? <circle key={`n${i}`} cx={n.x} cy={n.y} r={n.r * 0.75} fill="none" stroke={XANH} strokeWidth={Math.max(2, n.r * 0.28)} />
            : <text key={`n${i}`} x={n.x} y={n.y} fill={DO} fontWeight={800} fontSize={Math.max(11, n.r * 2.2)}
                textAnchor={n.neo === 'giua' ? 'middle' : n.neo === 'phai' ? 'end' : 'start'} dominantBaseline="middle">{n.txt}</text>)}
        {kq.o.map((o, i) => {
          const cam = can.length > 0 && laCam(o, can) && o.trangThai !== 'trong'
          const mau = cam ? 'var(--orange)' : MAU_O[o.trangThai]
          const phuMau = !cham || o.phan === 'sbd' || o.phan === 'ma' || o.phan === 'khac'
          return (
            <g key={i}>
              {cam && (
                <circle cx={o.x} cy={o.y} r={(o.r ?? 8) * 3.1}
                  fill="none" stroke="var(--orange)" strokeWidth={Math.max(2, (o.r ?? 8) * 0.22)} strokeDasharray="5 4">
                  <animate attributeName="stroke-opacity" values="1;0.25;1" dur="1.1s" repeatCount="indefinite" />
                </circle>
              )}
              <circle cx={o.x} cy={o.y} r={(o.r ?? 8) * 1.6}
                fill={phuMau && (o.to || cam) ? mau : '#000'}
                fillOpacity={phuMau ? (cam ? 0.4 : 0.25) : 0}
                stroke={phuMau ? mau : 'none'} strokeWidth={Math.max(1.5, (o.r ?? 8) * 0.18)}
                pointerEvents="all"
                style={{ cursor: onBam ? 'pointer' : 'default' }}
                onClick={onBam ? () => onBam(o) : undefined} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
