import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'

export type KieuNut = 'xanh' | 'vang' | 'do' | 'tim' | 'nhat' | ''

/** Nút bấm kiểu app gốc: viền đậm + bóng đổ, lớp .xanh/.vang/.do/.tim/.nhat */
export function Nut({ kieu = '', nho, className = '', children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { kieu?: KieuNut; nho?: boolean }) {
  return (
    <button className={`nut ${kieu} ${nho ? 'nho' : ''} ${className}`} {...p}>
      {children}
    </button>
  )
}

/** Link trông như nút (điều hướng hash) */
export function NutDen({ to, kieu = '', nho, className = '', children, ...p }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; kieu?: KieuNut; nho?: boolean }) {
  return (
    <a href={to} className={`nut ${kieu} ${nho ? 'nho' : ''} ${className}`} {...p}>
      {children}
    </a>
  )
}
