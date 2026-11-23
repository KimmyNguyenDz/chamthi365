import { useEffect, useState } from 'react'
import { sinhQR } from '../lib/qr'

/** Thẻ <img> hiển thị mã QR từ chuỗi payload */
export function MaQR({ text, size = 160 }: { text: string; size?: number }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    let song = true
    sinhQR(text).then(u => { if (song) setUrl(u) }).catch(() => { })
    return () => { song = false }
  }, [text])
  return url
    ? <img src={url} width={size} height={size} alt="QR" style={{ borderRadius: 8 }} />
    : <div style={{ width: size, height: size, background: '#eee', borderRadius: 8 }} />
}
