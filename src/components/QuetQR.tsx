import { useEffect, useRef, useState } from 'react'
import { quetQR } from '../lib/qr'
import { Nut } from './Nut'

/** Khung camera quét QR liên tục + nút chọn ảnh. Gọi onKq(text) khi đọc được. */
export function QuetQR({ onKq, onDong }: { onKq: (t: string) => void; onDong?: () => void }) {
  const vid = useRef<HTMLVideoElement>(null)
  const [loi, setLoi] = useState('')
  const xong = useRef(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let raf = 0
    const chay = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        const v = vid.current
        if (!v) { stream.getTracks().forEach(t => t.stop()); return }
        v.srcObject = stream
        await v.play()
        const quet = async () => {
          if (xong.current || !vid.current) return
          try {
            const t = await quetQR(vid.current)
            if (t) { xong.current = true; onKq(t); return }
          } catch { }
          raf = requestAnimationFrame(quet)
        }
        quet()
      } catch (e) {
        setLoi('Không mở được camera: ' + String((e as Error)?.message ?? e))
      }
    }
    chay()
    return () => { xong.current = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()) }
  }, [onKq])

  const chonAnh = async (f: File) => {
    try {
      const bmp = await createImageBitmap(f)
      const t = await quetQR(bmp)
      xong.current = true
      onKq(t)
    } catch (e) { setLoi(String((e as Error)?.message ?? e)) }
  }

  return <div style={{ display: 'grid', gap: 10 }}>
    <video ref={vid} playsInline muted style={{ width: '100%', borderRadius: 12, background: '#000', aspectRatio: '4/3' }} />
    {loi && <div className="chip cam">{loi}</div>}
    <div style={{ display: 'flex', gap: 8 }}>
      <label className="nut nhat">
        Chọn ảnh QR
        <input type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) chonAnh(f) }} />
      </label>
      {onDong && <Nut onClick={onDong}>Đóng</Nut>}
    </div>
  </div>
}
