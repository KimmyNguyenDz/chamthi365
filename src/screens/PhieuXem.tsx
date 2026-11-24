import { useEffect, useMemo, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The } from '../components/The'
import { AnhPhieu } from '../components/AnhPhieu'
import { dsPhieu, layAnh, layBai, layPhieu, luuPhieu, xoaPhieu } from '../lib/db'
import { chamPhieu, dinhDangDiem, timHocSinh, timMaDe } from '../lib/diem'
import { khuon as taiKhuon } from '../lib/thuvien'
import { docHieuLuc, diemTuLuan } from '../lib/chamKq'
import { thongBao } from '../lib/thongBao'
import type { Bai, OCham, Phieu } from '../types'
import { AlertTriangle } from 'lucide-react'

type SuaLoai = { o: OCham } | null

export function PhieuXem({ id }: { id: string }) {
  const [p, setP] = useState<Phieu | null>(null)
  const [bai, setBai] = useState<Bai | null>(null)
  const [anh, setAnh] = useState<Blob | null>(null)
  const [trang, setTrang] = useState<[number, number]>([1000, 1400])
  const [anhGoc, setAnhGoc] = useState(false)
  const [sua, setSua] = useState<SuaLoai>(null)
  const [suaSbd, setSuaSbd] = useState(false)
  const [suaMa, setSuaMa] = useState(false)
  const [ds, setDs] = useState<Phieu[]>([])
  const [khong, setKhong] = useState(false)

  useEffect(() => {
    ;(async () => {
      const x = await layPhieu(id)
      if (!x) { setKhong(true); return }
      setP(x)
      const b = await layBai(x.baiId)
      if (b) {
        setBai(b)
        try { const k = await taiKhuon(b.khuon); setTrang(k.trang) } catch { }
      }
      setAnh((await layAnh(x.id)) ?? null)
      setDs((await dsPhieu(x.baiId)).filter(y => y.ok).sort((a, b2) => a.stt - b2.stt))
    })()
  }, [id])

  const doc = useMemo(() => (p?.kq ? docHieuLuc(p) : null), [p])
  const diem = useMemo(() => (bai && doc ? chamPhieu(bai, doc, diemTuLuan(p!)) : null), [bai, doc, p])
  const can = useMemo(() => new Set(p?.kq?.can.map(c => `${c.phan}:${c.q ?? ''}:${c.i ?? ''}`) ?? []), [p])
  const hs = useMemo(() => (bai && doc ? timHocSinh(bai, doc.sbd)[0] : null), [bai, doc])
  const goiMa = useMemo(() => (bai && doc ? timMaDe(bai, doc.ma) : []), [bai, doc])
  const soSua = useMemo(() => {
    const s = p?.sua ?? {}
    return Object.keys(s).reduce((n, k) => n + (typeof s[k as keyof typeof s] === 'object' ? Object.keys(s[k as keyof typeof s] as object).length : 1), 0)
  }, [p])

  if (khong) return <ManHinh><p className="mo giua khoi">Phiếu này không còn trong máy</p><div className="giua"><NutDen to="#/" kieu="nhat">Về danh sách bài chấm</NutDen></div></ManHinh>
  if (!p || !bai || !doc) return <ManHinh><p className="mo giua khoi">Đang mở…</p></ManHinh>

  const ghiSua = async (kieu: string, q: number | undefined, gia: string | number | null) => {
    const s = { ...(p.sua ?? {}) }
    if (kieu === 'sbd' || kieu === 'ma' || kieu === 'tuLuan') {
      if (gia === null) delete s[kieu]; else s[kieu] = gia
    } else if (q !== undefined) {
      const phan = { ...(s[kieu] as Record<number, string> | undefined) }
      if (gia === null) delete phan[q]; else phan[q] = String(gia)
      if (Object.keys(phan).length) s[kieu] = phan; else delete s[kieu]
    }
    const moi = { ...p, sua: s }
    setP(moi)
    await luuPhieu(moi)
    thongBao(gia === null ? 'Đã bỏ sửa tay — dùng lại kết quả máy' : 'Đã lưu thay đổi')
    setSua(null); setSuaSbd(false); setSuaMa(false)
  }

  const viTri = ds.findIndex(x => x.id === p.id)
  const truoc = viTri > 0 ? ds[viTri - 1] : null
  const sau = viTri >= 0 && viTri < ds.length - 1 ? ds[viTri + 1] : null

  const bamO = (o: OCham) => {
    if (o.phan === 'sbd') setSuaSbd(true)
    else if (o.phan === 'ma') setSuaMa(true)
    else setSua(o.phan === 'p1' || o.phan === 'p2' || o.phan === 'p3' ? { o } : null)
  }

  return (
    <ManHinh tab={false} dau={
      <Dau tieuDe={`Phiếu số ${p.stt}`} phu={hs?.ten ?? `SBD ${doc.sbd || '?'}`} phai={
        <Nut kieu="do" nho onClick={async () => { if (confirm('Xóa phiếu này?')) { await xoaPhieu(p.id); history.back() } }}>Xóa</Nut>
      } />
    }>
      {/* Thanh điểm + sửa nhanh */}
      <The pang className="khoi">
        <div className="hang" style={{ justifyContent: 'space-between' }}>
          <div>
            <b style={{ fontSize: 17 }}>{hs?.ten ?? 'Chưa nhận tên'}</b>
            <div className="mo nho">
              SBD <a href="#/" onClick={e => { e.preventDefault(); setSuaSbd(true) }}>{doc.sbd || '—'}{doc.sbdNguon === 'tay' ? ' ✎' : ''}</a>
              {' · '}Mã <a href="#/" onClick={e => { e.preventDefault(); setSuaMa(true) }}>{doc.ma || '—'}{doc.maNguon === 'tay' ? ' ✎' : ''}</a>
              {doc.khac?.map(k => ` · ${k.ten} ${k.s}`).join('')}
            </div>
          </div>
          <div className="giua">
            <div style={{ font: `800 24px/1 var(--f-head)`, color: 'var(--green-d)' }}>{diem?.coDapAn ? dinhDangDiem(diem.tong) : '—'}</div>
            <div className="mo nho">{diem ? `I ${dinhDangDiem(diem.phan.p1)} · II ${dinhDangDiem(diem.phan.p2)} · III ${dinhDangDiem(diem.phan.p3)}` : ''}</div>
          </div>
        </div>
        {diem && bai.diem.tuLuan > 0 && (
          <div className="hang" style={{ marginTop: 8 }}>
            <span className="mo nho">Điểm tự luận (/{dinhDangDiem(bai.diem.tuLuan)}):</span>
            <input className="o-vao" type="number" step="0.25" min="0" max={bai.diem.tuLuan} style={{ width: 90, minHeight: 38, padding: '2px 10px' }}
              value={diemTuLuan(p) || ''} onChange={e => ghiSua('tuLuan', undefined, e.target.value === '' ? null : +e.target.value)} />
          </div>
        )}
        {soSua > 0 && <p className="trang-thai xanh" style={{ marginBottom: 0 }}>✎ Đã sửa tay {soSua} chỗ — thay đổi được lưu ngay, điểm đã tính lại.</p>}
        {p.kq!.can.length > 0 && <p className="trang-thai cam" style={{ marginBottom: 0 }}><AlertTriangle size={14} /> {p.kq!.can.length} chỗ máy chưa chắc — bấm vào ô cam trên phiếu để xác nhận.</p>}
      </The>

      <div className="hang khoi">
        {truoc && <NutDen to={`#/phieu/${truoc.id}`} kieu="nhat" nho>← Trước</NutDen>}
        <Nut kieu="nhat" nho onMouseDown={() => setAnhGoc(true)} onMouseUp={() => setAnhGoc(false)}
          onTouchStart={() => setAnhGoc(true)} onTouchEnd={() => setAnhGoc(false)}>Giữ xem ảnh gốc</Nut>
        {sau && <NutDen to={`#/phieu/${sau.id}`} kieu="nhat" nho>Sau →</NutDen>}
        <NutDen to={`#/bai/${bai.id}`} kieu="nhat" nho style={{ marginLeft: 'auto' }}>Về bài</NutDen>
      </div>

      {!anhGoc
        ? <AnhPhieu anh={anh} kq={p.kq!} trang={trang} can={can} onBam={bamO} />
        : <AnhPhieuGoc p={p} />}

      {/* Popup sửa ô P1/P2/P3 */}
      {sua && (
        <PopupSua p={p} bai={bai} o={sua.o} doc={doc} onChon={(g) => ghiSua(sua.o.phan, sua.o.q, g)} onDong={() => setSua(null)} />
      )}

      {/* Popup sửa SBD */}
      {suaSbd && (
        <PopGiua onDong={() => setSuaSbd(false)}>
          <h3>Số báo danh (máy đoán {p.kq!.doc.sbd || '?'})</h3>
          <input className="o-vao" defaultValue={doc.sbd} inputMode="numeric" id="o-sbd" />
          {bai.hocSinh.length > 0 && timHocSinh(bai, doc.sbd).length > 0 && (
            <div className="hang" style={{ flexWrap: 'wrap', margin: '8px 0' }}>
              {timHocSinh(bai, doc.sbd).map(g => (
                <button key={g.v} className="chip" onClick={() => ghiSua('sbd', undefined, g.v)}>{g.v} · {g.ten}</button>
              ))}
            </div>
          )}
          <div className="hang">
            <Nut kieu="xanh" style={{ flex: 1 }} onClick={() => ghiSua('sbd', undefined, (document.getElementById('o-sbd') as HTMLInputElement).value.trim())}>Lưu</Nut>
            {p.sua?.sbd != null && <Nut kieu="nhat" onClick={() => ghiSua('sbd', undefined, null)}>Bỏ sửa tay</Nut>}
          </div>
        </PopGiua>
      )}

      {/* Popup sửa mã đề */}
      {suaMa && (
        <PopGiua onDong={() => setSuaMa(false)}>
          <h3>Mã đề (máy đoán {p.kq!.doc.ma || '?'})</h3>
          <input className="o-vao" defaultValue={doc.ma} id="o-ma" />
          {goiMa.length > 0 && (
            <div className="hang" style={{ flexWrap: 'wrap', margin: '8px 0' }}>
              {goiMa.map(g => <button key={g.v} className="chip" onClick={() => ghiSua('ma', undefined, g.v)}>{g.v}{g.khop ? ' ✓' : ''}</button>)}
            </div>
          )}
          <div className="hang">
            <Nut kieu="xanh" style={{ flex: 1 }} onClick={() => ghiSua('ma', undefined, (document.getElementById('o-ma') as HTMLInputElement).value.trim())}>Lưu</Nut>
            {p.sua?.ma != null && <Nut kieu="nhat" onClick={() => ghiSua('ma', undefined, null)}>Bỏ sửa tay</Nut>}
          </div>
        </PopGiua>
      )}
    </ManHinh>
  )
}

function AnhPhieuGoc({ p }: { p: Phieu }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    layAnh(p.id).then(b => { if (b) setUrl(URL.createObjectURL(b)) })
  }, [p.id])
  return url
    ? <img src={url} alt="Ảnh gốc" style={{ width: '100%', border: 'var(--bo)', borderRadius: 14, filter: 'contrast(1.1)' }} />
    : <div className="the giua mo" style={{ padding: 60 }}>Không lưu ảnh gốc</div>
}

function PopGiua({ children, onDong }: { children: React.ReactNode; onDong: () => void }) {
  return (
    <div onClick={onDong} style={{ position: 'fixed', inset: 0, zIndex: 80, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="the" onClick={e => e.stopPropagation()} style={{ maxWidth: 400, width: '100%' }}>
        {children}
      </div>
    </div>
  )
}

/** Popup sửa ô P1 (A-D) / P2 (Đ/S từng ý) / P3 (đáp số) */
function PopupSua({ p, bai, o, doc, onChon, onDong }: {
  p: Phieu; bai: Bai; o: OCham; doc: ReturnType<typeof docHieuLuc>
  onChon: (g: string | null) => void; onDong: () => void
}) {
  const q = o.q ?? 0
  const da = bai.dapAn.find(d => d.ma === doc.ma)
  const daDung = o.phan === 'p1' ? da?.p1[q] : o.phan === 'p2' ? da?.p2[q] : da?.p3[q]
  const suaKey = (o.phan + ':' + q)
  const daSua = (p.sua?.[o.phan] as Record<number, string> | undefined)?.[q]

  if (o.phan === 'p1') {
    const g = doc.p1[q] ?? ''
    return (
      <PopGiua onDong={onDong}>
        <h3>Phần I câu {q + 1}{daSua ? ' (đang sửa tay)' : ''}</h3>
        {daDung && <p className="mo nho">Đáp án: <b>{daDung === '*' ? 'câu huỷ' : daDung}</b></p>}
        <div className="hang" style={{ flexWrap: 'wrap' }}>
          {['A', 'B', 'C', 'D'].map(c => (
            <button key={c} className={`chip ${g.includes(c) ? 'bat' : ''}`} style={{ width: 44, height: 40, justifyContent: 'center' }}
              onClick={() => {
                const s = g.includes(c) ? g.replace(c, '') : (g + c).split('').sort().join('')
                onChon(s)
              }}>{c}</button>
          ))}
          <button className="chip" onClick={() => onChon('')}>Bỏ trống</button>
          {daSua !== undefined && <button className="chip" onClick={() => onChon(null)}>Dùng kết quả máy</button>}
        </div>
      </PopGiua>
    )
  }
  if (o.phan === 'p2') {
    const g = doc.p2[q] ?? []
    return (
      <PopGiua onDong={onDong}>
        <h3>Phần II câu {q + 1}{daSua ? ' (đang sửa tay)' : ''}</h3>
        {daDung && <p className="mo nho">Đáp án: <b>{daDung}</b></p>}
        <div className="hang" style={{ flexWrap: 'wrap' }}>
          {(['a', 'b', 'c', 'd'] as const).map((y, i) => {
            const v = g[i] ?? ''
            return (
              <button key={y} className="chip bat" style={{ width: 52, height: 40, justifyContent: 'center' }}
                onClick={() => {
                  const a = (doc.p2[q] ?? []).slice()
                  while (a.length < 4) a.push('')
                  a[i] = v === 'Đ' ? 'S' : v === 'S' ? '' : 'Đ'
                  onChon(a.join(''))
                }}>
                {y}: <b>{v || '·'}</b>
              </button>
            )
          })}
          {daSua !== undefined && <button className="chip" onClick={() => onChon(null)}>Dùng kết quả máy</button>}
        </div>
      </PopGiua>
    )
  }
  return (
    <PopGiua onDong={onDong}>
      <h3>Phần III câu {q + 1}{daSua ? ' (đang sửa tay)' : ''}</h3>
      {daDung && <p className="mo nho">Đáp án: <b>{daDung === '*' ? 'câu huỷ' : daDung}</b></p>}
      <input className="o-vao" defaultValue={doc.p3[q] ?? ''} id="o-p3" placeholder="Học sinh bỏ trống thì để trống" />
      <div className="hang" style={{ marginTop: 8 }}>
        <Nut kieu="xanh" style={{ flex: 1 }} onClick={() => onChon((document.getElementById('o-p3') as HTMLInputElement).value.trim())}>Lưu</Nut>
        {daSua !== undefined && <Nut kieu="nhat" onClick={() => onChon(null)}>Dùng kết quả máy</Nut>}
      </div>
    </PopGiua>
  )
}
