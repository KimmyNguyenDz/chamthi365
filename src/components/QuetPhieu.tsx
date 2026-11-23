import { useRef, useState } from 'react'
import type { MauPhieu } from '../types'
import { mucLuc, tomTat, urlAnh } from '../lib/thuvien'
import { nhanDang, taiDbNhanDang, type DbNhanDang } from '../lib/nhanDang'
import type { AnhRgba } from '../lib/omr'
import { Nut } from './Nut'

/** Blob ảnh → RGBA để đưa vào nhan-dang */
export async function anhRgba(b: Blob, canh = 1400): Promise<AnhRgba> {
  const bm = await createImageBitmap(b)
  const ty = Math.min(1, canh / Math.max(bm.width, bm.height))
  const w = Math.round(bm.width * ty), h = Math.round(bm.height * ty)
  const cv = document.createElement('canvas')
  cv.width = w; cv.height = h
  const cx = cv.getContext('2d')!
  cx.drawImage(bm, 0, 0, w, h)
  bm.close()
  const im = cx.getImageData(0, 0, w, h)
  return { w, h, d: new Uint8ClampedArray(im.data.buffer as ArrayBuffer) }
}

let _db: Promise<DbNhanDang> | null = null
const dbNhanDang = () => (_db ??= taiDbNhanDang())

/** Chụp 1 tờ → nhận loại phiếu → top-5 gợi ý có ảnh mẫu so sánh */
export function QuetPhieu({ onChon, onDong }: { onChon: (m: MauPhieu) => void; onDong: () => void }) {
  const [dangChay, setDangChay] = useState(false)
  const [loi, setLoi] = useState('')
  const [goiY, setGoiY] = useState<MauPhieu[] | null>(null)
  const inp = useRef<HTMLInputElement>(null)

  const quet = async (f: File) => {
    setDangChay(true); setLoi(''); setGoiY(null)
    try {
      const [anh, db, ml] = await Promise.all([anhRgba(f), dbNhanDang(), mucLuc()])
      const kq = nhanDang(anh, db)
      const theoKhuon = new Map<string, MauPhieu>()
      for (const m of ml) for (const k of m.khuon) if (!theoKhuon.has(k.khuon)) theoKhuon.set(k.khuon, m)
      const gy = kq.goiY.map(g => theoKhuon.get(g.khuon)).filter((x): x is MauPhieu => !!x).slice(0, 5)
      if (!gy.length) setLoi('Máy chưa nhận ra loại phiếu. Thầy chụp lại cho thấy đủ 4 ô vuông đen ở 4 góc, phiếu nằm phẳng.')
      else setGoiY(gy)
    } catch (e) {
      setLoi('Máy nhận dạng gặp sự cố — thử lại: ' + String((e as Error)?.message ?? e))
    } finally { setDangChay(false) }
  }

  return (
    <div onClick={onDong} style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="the" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '100%', maxHeight: '86dvh', overflowY: 'auto' }}>
        <h2>Quét nhận loại phiếu</h2>
        <p className="mo nho">Chụp 1 tờ phiếu — máy tìm trong {''}thư viện loại giống nhất rồi gợi ý.</p>

        <input ref={inp} type="file" accept="image/*" capture="environment" hidden
          onChange={e => { const f = e.target.files?.[0]; if (f) quet(f); e.target.value = '' }} />
        <Nut kieu="xanh" style={{ width: '100%' }} disabled={dangChay} onClick={() => inp.current?.click()}>
          {dangChay ? 'Đang nhận dạng…' : 'Chụp / chọn ảnh phiếu'}
        </Nut>

        {loi && <p className="mo" style={{ color: 'var(--red-d)' }}>{loi}</p>}

        {goiY && (
          <>
            <p className="mo nho" style={{ marginTop: 12 }}>
              {goiY.length === 1
                ? 'Máy đoán phiếu của thầy là loại dưới đây. Thầy so ảnh mẫu rồi bấm chọn.'
                : 'Máy chưa chắc lắm — thầy so ảnh mẫu với tờ phiếu rồi bấm chọn đúng loại.'}
            </p>
            {goiY.map(m => (
              <button key={m.ma} onClick={() => onChon(m)}
                style={{ display: 'flex', gap: 10, width: '100%', textAlign: 'left', alignItems: 'center', padding: '8px 0', border: 0, background: 'none', borderBottom: '1px solid var(--line-2)', cursor: 'pointer' }}>
                <img src={urlAnh(m)} alt="" style={{ width: 62, height: 84, objectFit: 'cover', border: '2px solid var(--ink)', borderRadius: 8 }} />
                <span>
                  <b>{m.ten}</b>
                  <div className="mo nho">{tomTat(m)}</div>
                </span>
              </button>
            ))}
          </>
        )}

        <div className="cach" />
        <Nut kieu="nhat" style={{ width: '100%' }} onClick={onDong}>Đóng</Nut>
      </div>
    </div>
  )
}
