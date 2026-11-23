import type { PropsWithChildren, ReactNode } from 'react'

/** Thẻ bo góc viền đậm của app gốc */
export function The({ children, pang, className = '', onClick }: PropsWithChildren<{ pang?: boolean; className?: string; onClick?: () => void }>) {
  return (
    <div className={`the ${pang ? 'the-pang' : ''} ${className}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      {children}
    </div>
  )
}

/** Tiêu đề mục nhỏ kiểu app gốc */
export function Muc({ children, phai }: PropsWithChildren<{ phai?: ReactNode }>) {
  return (
    <div className="muc hang" style={{ justifyContent: 'space-between' }}>
      <h2>{children}</h2>
      {phai}
    </div>
  )
}
