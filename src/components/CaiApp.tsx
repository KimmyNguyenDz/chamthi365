import { useEffect, useState } from 'react'
import { The } from './The'
import { Nut } from './Nut'

type Bip = { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }

/** Thẻ gợi ý cài app — theo UA: Android dùng prompt, iOS hướng dẫn Share, webview Zalo/FB khuyên mở trình duyệt */
export function CaiApp() {
  const [bip, setBip] = useState<Bip | null>(null)
  const [an, setAn] = useState(false)

  useEffect(() => {
    const f = (e: Event) => { e.preventDefault(); setBip(e as unknown as Bip) }
    addEventListener('beforeinstallprompt', f)
    return () => removeEventListener('beforeinstallprompt', f)
  }, [])

  if (an) return null
  if (typeof window === 'undefined') return null
  if (matchMedia('(display-mode: standalone)').matches) return null
  if (localStorage.getItem('cp-an-cai') === '1') return null

  const ua = navigator.userAgent
  const ios = /iPad|iPhone|iPod/.test(ua)
  const webview = /Zalo|FBAN|FBAV|Instagram/i.test(ua)

  const dong = () => { localStorage.setItem('cp-an-cai', '1'); setAn(true) }

  if (webview) return (
    <The className="khoi" pang>
      <div className="hang" style={{ justifyContent: 'space-between' }}>
        <b>Mở bằng trình duyệt để quét được phiếu</b>
        <button className="nut nho nhat" onClick={dong}>×</button>
      </div>
      <p className="mo nho">Bấm ⋮ góc trên → “Mở bằng trình duyệt” (Safari/Chrome) — trong Zalo/Facebook camera không quét được phiếu.</p>
    </The>
  )

  return (
    <The className="khoi" pang>
      <div className="hang" style={{ justifyContent: 'space-between' }}>
        <b>Cài Chamthi365 vào màn hình chính</b>
        <button className="nut nho nhat" onClick={dong}>×</button>
      </div>
      {bip ? (
        <Nut kieu="xanh" nho onClick={async () => { await bip.prompt(); if ((await bip.userChoice).outcome === 'accepted') setAn(true) }}>Cài đặt ngay</Nut>
      ) : ios ? (
        <p className="mo nho">Safari → nút Chia sẻ <b>⎋</b> → “Thêm vào MH chính”. Chấm được cả khi mất mạng.</p>
      ) : (
        <p className="mo nho">Chrome → ⋮ → “Cài đặt ứng dụng”. Chấm được cả khi mất mạng.</p>
      )}
    </The>
  )
}
