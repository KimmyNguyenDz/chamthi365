import type { PropsWithChildren } from 'react'
import { layMeta, datMetaDongBo } from '../lib/db'
import { useEffect, useState } from 'react'
import { The } from './The'
import { Nut } from './Nut'

export type CaiDatChamT = {
  tuChup: boolean
  doNhay: 'nhanh' | 'chac'
  hienKq: boolean
  beep: boolean
  rung: boolean
  docDiem: boolean
  giaDo: boolean
  khung: 'tron' | 'kin'
}

export const CD_MAC_DINH: CaiDatChamT = {
  tuChup: true, doNhay: 'chac', hienKq: true, beep: true, rung: true, docDiem: false, giaDo: false, khung: 'tron',
}

export const KHOA_CD = 'cp-cai-dat-cham'

export function useCaiDatCham(): [CaiDatChamT, (p: Partial<CaiDatChamT>) => void] {
  const [cd, setCd] = useState<CaiDatChamT>(CD_MAC_DINH)
  useEffect(() => { layMeta(KHOA_CD).then(v => v && setCd({ ...CD_MAC_DINH, ...(v as object) })) }, [])
  const dat = (p: Partial<CaiDatChamT>) => setCd(v => {
    const m = { ...v, ...p }
    datMetaDongBo(KHOA_CD, m)
    return m
  })
  return [cd, dat]
}

function CongTac({ children, bat, on }: PropsWithChildren<{ bat: boolean; on: (b: boolean) => void }>) {
  return (
    <label className="con-tat" style={{ justifyContent: 'space-between', width: '100%', padding: '8px 0' }}>
      <span>{children}</span>
      <input type="checkbox" checked={bat} onChange={e => on(e.target.checked)} />
    </label>
  )
}

/** Panel cài đặt chấm — bật/tắt giống app gốc */
export function CaiDatCham({ cd, dat, onDong }: { cd: CaiDatChamT; dat: (p: Partial<CaiDatChamT>) => void; onDong: () => void }) {
  return (
    <div onClick={onDong} style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#000a', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <The className="" pang={false}>
        <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460 }}>
          <h2>Cài đặt chấm</h2>
          <CongTac bat={cd.tuChup} on={b => dat({ tuChup: b })}>Tự chụp khi phiếu đứng yên</CongTac>
          <CongTac bat={cd.hienKq} on={b => dat({ hienKq: b })}>Hiện điểm sau mỗi phiếu</CongTac>
          <CongTac bat={cd.beep} on={b => dat({ beep: b })}>Bíp khi chấm xong</CongTac>
          <CongTac bat={cd.rung} on={b => dat({ rung: b })}>Rung</CongTac>
          <CongTac bat={cd.docDiem} on={b => dat({ docDiem: b })}>Đọc to điểm</CongTac>
          <CongTac bat={cd.giaDo} on={b => dat({ giaDo: b })}>Chế độ giá đỡ (máy để yên, đưa phiếu vào)</CongTac>
          <div className="hang" style={{ marginTop: 8 }}>
            <span className="mo nho">Độ nhạy:</span>
            {(['nhanh', 'chac'] as const).map(d => (
              <button key={d} className={`chip ${cd.doNhay === d ? 'bat' : ''}`} onClick={() => dat({ doNhay: d })}>
                {d === 'nhanh' ? 'Nhanh (chấp nhận mờ)' : 'Chắc (đợi ảnh nét)'}
              </button>
            ))}
          </div>
          <div className="cach" />
          <Nut kieu="xanh" style={{ width: '100%' }} onClick={onDong}>Xong</Nut>
        </div>
      </The>
    </div>
  )
}
