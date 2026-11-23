import { useEffect, useMemo, useState } from 'react'
import type { MauPhieu } from '../types'
import { dsHo, dsSoCau, locMau, mucLuc, nhanCau, nhanHo, tomTat, urlAnh, type LocMau } from '../lib/thuvien'

/** Lưới chọn mẫu phiếu: lọc họ/từ/số câu/phách + tìm + ảnh preview — giống app gốc */
export function ChonPhieu({ chon, onChon, chiCoCau }: { chon?: string; onChon: (m: MauPhieu) => void; chiCoCau?: boolean }) {
  const [ds, setDs] = useState<MauPhieu[] | null>(null)
  const [f, setF] = useState<LocMau>({})
  const [xem, setXem] = useState<MauPhieu | null>(null)

  useEffect(() => { mucLuc().then(setDs) }, [])
  const loc = useMemo(() => (ds ? locMau(ds, f) : []), [ds, f])
  const hos = useMemo(() => (ds ? dsHo(ds) : []), [ds])
  const soCaus = useMemo(() => (ds ? dsSoCau(ds) : []), [ds])

  const Chip = ({ v, bat, on }: { v: string; bat: boolean; on: () => void }) => (
    <button className={`chip ${bat ? 'bat' : ''}`} onClick={on}>{v}</button>
  )

  return (
    <div>
      <input className="o-vao" placeholder="Tìm theo tên phiếu…" onChange={e => setF(x => ({ ...x, tim: e.target.value }))} />
      <div className="hang" style={{ flexWrap: 'wrap', margin: '10px 0' }}>
        {(['', 'QM', 'moi', 'truong'] as const).map(t => (
          <Chip key={t} v={t === '' ? 'Tất cả' : t === 'QM' ? 'QM' : t === 'moi' ? 'Mẫu mới' : 'Phiếu trường'}
            bat={(f.tu ?? '') === t} on={() => setF(x => ({ ...x, tu: t || undefined }))} />
        ))}
        <Chip v="Phách" bat={f.phach === true} on={() => setF(x => ({ ...x, phach: x.phach ? undefined : true }))} />
      </div>
      <div className="hang" style={{ flexWrap: 'wrap', margin: '0 0 8px' }}>
        {hos.map(h => <Chip key={h} v={h} bat={f.ho === h} on={() => setF(x => ({ ...x, ho: x.ho === h ? undefined : h }))} />)}
      </div>
      <div className="hang" style={{ flexWrap: 'wrap', margin: '0 0 10px' }}>
        {soCaus.map(c => <Chip key={c} v={c} bat={f.soCau === c} on={() => setF(x => ({ ...x, soCau: x.soCau === c ? undefined : c }))} />)}
      </div>

      {ds === null ? <p className="mo giua">Đang tải thư viện phiếu…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(148px,1fr))', gap: 10 }}>
          {loc.map(m => (
            <button key={m.ma} onClick={() => onChon(m)}
              className="the the-pang"
              style={{ cursor: 'pointer', textAlign: 'left', border: chon === m.ma ? '3px solid var(--green-d)' : undefined, background: '#fff' }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, minHeight: 34 }}>{m.ten}</div>
              <div className="mo" style={{ fontSize: 11.5 }}>{nhanCau(m)} · {m.phach ? 'phách · ' : ''}{m.so_trang} trang</div>
              <div className="hang" style={{ marginTop: 6, gap: 6 }}>
                <img src={urlAnh(m)} alt="" loading="lazy"
                  style={{ width: 42, height: 58, objectFit: 'cover', border: '1.5px solid var(--line)', borderRadius: 6 }}
                  onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                <button className="chip" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); setXem(m) }}>Xem</button>
              </div>
            </button>
          ))}
          {loc.length === 0 && <p className="mo">Không có mẫu khớp bộ lọc.</p>}
        </div>
      )}

      {xem && (
        <div onClick={() => setXem(null)} style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#000a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 14, maxWidth: 420, width: '100%', maxHeight: '86dvh', overflowY: 'auto' }}>
            <b>{xem.ten}</b>
            <div className="mo nho">{nhanHo(xem)} · {tomTat(xem)} · {xem.so_trang} trang</div>
            <img src={urlAnh(xem)} alt={xem.ten} style={{ width: '100%', marginTop: 8, border: '2px solid var(--line)', borderRadius: 10 }} />
            <div className="hang" style={{ marginTop: 10 }}>
              <button className="nut xanh" style={{ flex: 1 }} onClick={() => { onChon(xem); setXem(null) }}>Chọn mẫu này</button>
              <button className="nut nhat" onClick={() => setXem(null)}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
