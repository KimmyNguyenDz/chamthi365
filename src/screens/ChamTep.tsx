import { useEffect, useMemo, useRef, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The, Muc } from '../components/The'
import { anhRgba } from '../components/QuetPhieu'
import { layBai, dsPhieu } from '../lib/db'
import { chamPhieu, dinhDangDiem } from '../lib/diem'
import { luuPhieuMoi } from '../lib/chamKq'
import { taoBoMayCham } from '../lib/mayCham'
import { docPdf, tachClip } from '../lib/pdf'
import { khuon as taiKhuon, mucLuc } from '../lib/thuvien'
import type { Bai, Khuon, KhuonTep, Phieu } from '../types'

type TienDo = { xong: number; tong: number; loi: { tep: string; loi: string }[]; moi: Phieu[] }

/** Chấm hàng loạt từ file ảnh / PDF máy scan */
export function ChamTep({ id }: { id: string }) {
  const [bai, setBai] = useState<Bai | null>(null)
  const [kts, setKts] = useState<KhuonTep[]>([])
  const [khuons, setKhuons] = useState<Map<string, Khuon>>(new Map())
  const [td, setTd] = useState<TienDo>({ xong: 0, tong: 0, loi: [], moi: [] })
  const [dangChay, setDangChay] = useState(false)
  const [loi, setLoi] = useState('')
  const huyRef = useRef(false)
  const sttRef = useRef(0)
  const boMayRef = useRef<ReturnType<typeof taoBoMayCham> | null>(null)

  useEffect(() => {
    ;(async () => {
      const b = await layBai(id)
      if (!b) { setLoi('Bài chấm này không còn trong máy'); return }
      setBai(b)
      sttRef.current = (await dsPhieu(id)).reduce((m, p) => Math.max(m, p.stt), 0)
      const m = (await mucLuc()).find(x => x.ma === b.phieu)
      const dsK = m?.khuon?.length ? m.khuon : [{ trang: 0, clip: null, khuon: b.khuon }]
      setKts(dsK)
      const km = new Map<string, Khuon>()
      for (const kt of dsK) if (!km.has(kt.khuon)) km.set(kt.khuon, await taiKhuon(kt.khuon))
      setKhuons(km)
    })()
    boMayRef.current ??= taoBoMayCham()
  }, [id])

  const soTrang = useMemo(() => Math.max(1, ...kts.map(k => (k.trang ?? 0) + 1)), [kts])

  const chamMot = async (bmp: { w: number; h: number; buf: ArrayBuffer }, khuon: Khuon, nguon: string) => {
    const r = await boMayRef.current!.cham(bmp, khuon, true)
    const { phieu } = await luuPhieuMoi(bai!, r, nguon, ++sttRef.current)
    return phieu
  }

  const chay = async (files: FileList | File[]) => {
    if (!bai || !khuons.size || dangChay) return
    setDangChay(true); huyRef.current = false
    setTd({ xong: 0, tong: files.length, loi: [], moi: [] })
    const kt0 = kts.filter(k => (k.trang ?? 0) === 0)
    try {
      for (const f of Array.from(files)) {
        if (huyRef.current) break
        try {
          if (/pdf$/i.test(f.name) || f.type === 'application/pdf') {
            let i = 0
            for await (const pg of docPdf(await f.arrayBuffer())) {
              if (huyRef.current) break
              const trang = soTrang > 1 ? i % soTrang : 0
              const vung = tachClip(kts, trang, pg.wPt, pg.hPt, pg.bmp.width, pg.bmp.height)
              const vungDung = vung.length ? vung : kt0.map(kt => ({ kt, rect: [0, 0, pg.bmp.width, pg.bmp.height] as [number, number, number, number] }))
              for (const { kt, rect } of vungDung) {
                const [x, y, w, h] = rect
                const cv = document.createElement('canvas')
                cv.width = Math.round(w); cv.height = Math.round(h)
                cv.getContext('2d')!.drawImage(pg.bmp, x, y, w, h, 0, 0, cv.width, cv.height)
                const im = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height)
                const p = await chamMot({ w: cv.width, h: cv.height, buf: im.data.buffer.slice(0) as ArrayBuffer }, khuons.get(kt.khuon)!, 'tep')
                setTd(t => ({ ...t, moi: [...t.moi, p], loi: p.ok ? t.loi : [...t.loi, { tep: `${f.name} · tr.${pg.trang + 1}`, loi: p.loi! }] }))
              }
              i++
            }
          } else {
            const anh = await anhRgba(f, 2000)
            const p = await chamMot({ w: anh.w, h: anh.h, buf: anh.d.buffer as ArrayBuffer }, khuons.get(kt0[0].khuon)!, 'tep')
            setTd(t => ({ ...t, moi: [...t.moi, p], loi: p.ok ? t.loi : [...t.loi, { tep: f.name, loi: p.loi! }] }))
          }
        } catch (e) {
          setTd(t => ({ ...t, loi: [...t.loi, { tep: f.name, loi: String((e as Error)?.message ?? e) }] }))
        }
        setTd(t => ({ ...t, xong: t.xong + 1 }))
      }
    } finally { setDangChay(false) }
  }

  if (loi) return <ManHinh><p className="mo giua khoi">{loi}</p><div className="giua"><NutDen to="#/" kieu="nhat">Về danh sách bài chấm</NutDen></div></ManHinh>
  if (!bai) return <ManHinh><p className="mo giua khoi">Đang mở…</p></ManHinh>

  return (
    <ManHinh dau={<Dau tieuDe={`Chấm từ tệp — ${bai.ten}`} phu={`${td.moi.length} phiếu mới`} />}>
      <The pang className="khoi">
        <label className="nut xanh" style={{ width: '100%', cursor: 'pointer' }}>
          {dangChay ? `Đang chấm ${td.xong}/${td.tong}…` : 'Chọn ảnh hoặc PDF máy scan'}
          <input type="file" accept="image/*,.pdf" multiple hidden disabled={dangChay}
            onChange={e => { if (e.target.files?.length) chay(e.target.files); e.target.value = '' }} />
        </label>
        {dangChay && <Nut kieu="do" nho style={{ marginTop: 8 }} onClick={() => { huyRef.current = true }}>Dừng</Nut>}
        <p className="mo nho" style={{ marginBottom: 0 }}>
          Mẹo chụp đẹp: đủ 4 ô vuông đen ở 4 góc, phiếu nằm phẳng, không lẹm mép; PDF máy scan nên ≥200dpi, mỗi trang một phiếu (phiếu 2 tờ/trang máy tự tách).
        </p>
      </The>

      {td.loi.length > 0 && (
        <The pang className="khoi">
          <b style={{ color: 'var(--red-d)' }}>{td.loi.length} tờ không đọc được</b>
          {td.loi.map((l, i) => <div key={i} className="mo nho">· {l.tep}: {l.loi} — chụp lại tờ này</div>)}
        </The>
      )}

      <Muc phai={<NutDen to={`#/bai/${id}`} kieu="nhat" nho>Xong → bài chấm</NutDen>}>Phiếu vừa chấm</Muc>
      {td.moi.slice().reverse().map(p => {
        const kq = p.ok && p.kq ? chamPhieu(bai, p.kq.doc, 0) : null
        return (
          <a key={p.id} href={`#/phieu/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
            <The pang className="khoi">
              <div className="hang" style={{ justifyContent: 'space-between' }}>
                <span>
                  <b>Phiếu số {p.stt}</b>
                  <div className="mo nho">{p.ok ? `SBD ${p.kq!.doc.sbd || '?'} · mã ${p.kq!.doc.ma || '?'}` : `Không đọc được · ${p.loi}`}</div>
                </span>
                <b style={{ color: 'var(--green-d)', fontSize: 18 }}>{kq?.coDapAn ? dinhDangDiem(kq.tong) : '—'}</b>
              </div>
            </The>
          </a>
        )
      })}
      {!dangChay && !td.moi.length && <p className="mo giua">Chưa chấm tờ nào — chọn ảnh hoặc PDF ở trên.</p>}
    </ManHinh>
  )
}
