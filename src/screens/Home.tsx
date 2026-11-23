import { useEffect, useMemo, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The, Muc } from '../components/The'
import { dsBai, dsPhieu, luuBai, dangKyThayDoi } from '../lib/db'
import { chamPhieu, dinhDangDiem, diemMau } from '../lib/diem'
import type { Bai, Phieu } from '../types'
import { useDaXemHd } from './HuongDan'
import { CaiApp } from '../components/CaiApp'

const THU = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

export type ThongBai = {
  bai: Bai
  soPhieu: number
  daCham: number
  canXem: number
  loi: number
  tb: number | null
  thieuMa: string[]
}

/** Gom thống kê 1 bài: số phiếu, điểm TB, cảnh báo */
export async function thongKeBai(bai: Bai): Promise<ThongBai> {
  const ps = await dsPhieu(bai.id)
  let daCham = 0, canXem = 0, loi = 0, tong = 0, soTinh = 0
  const thieuMa = new Set<string>()
  for (const p of ps) {
    if (!p.ok || !p.kq) { if (!p.ok) loi++; continue }
    daCham++
    if (p.kq.can.length > 0) canXem++
    const kq = chamPhieu(bai, p.kq.doc, (p.sua?.tuLuan as number) || 0)
    if (kq.coDapAn) { tong += kq.tong; soTinh++ }
    else if (p.kq.doc.ma) thieuMa.add(p.kq.doc.ma)
  }
  return { bai, soPhieu: ps.length, daCham, canXem, loi, tb: soTinh ? tong / soTinh : null, thieuMa: [...thieuMa] }
}

function TheBai({ t }: { t: ThongBai }) {
  const { bai } = t
  return (
    <a href={`#/bai/${bai.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <The className="khoi" pang>
        <div className="hang" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ minWidth: 0 }}>
            <b style={{ fontSize: 17 }}>{bai.ten || 'Bài chấm'}</b>
            <div className="mo nho">
              {bai.mon || '—'}{bai.lop.length ? ` · ${bai.lop.join(', ')}` : ''} · {t.daCham}
              {bai.hocSinh.length ? `/${bai.hocSinh.length}` : ''} phiếu đã chấm
            </div>
          </div>
          {t.tb != null && (
            <div className="giua" style={{ flexShrink: 0 }}>
              <div style={{ font: `800 22px/1 var(--f-head)`, color: 'var(--green-d)' }}>{dinhDangDiem(t.tb)}</div>
              <div className="mo nho">Điểm TB</div>
            </div>
          )}
        </div>
        {(t.canXem > 0 || t.loi > 0 || t.thieuMa.length > 0 || !bai.dapAn.length) && (
          <div className="hang" style={{ flexWrap: 'wrap', marginTop: 8 }}>
            {t.canXem > 0 && <span className="chip" style={{ borderColor: 'var(--orange-d)', background: 'var(--orange-l)' }}>{t.canXem} phiếu còn chỗ cần xem</span>}
            {t.loi > 0 && <span className="chip" style={{ borderColor: 'var(--red-d)', background: 'var(--red-l)' }}>{t.loi} không đọc được</span>}
            {t.thieuMa.length > 0 && <span className="chip" style={{ borderColor: 'var(--red-d)', background: 'var(--red-l)' }}>Thiếu đáp án mã {t.thieuMa.join(', ')}</span>}
            {!bai.dapAn.length && <span className="chip" style={{ borderColor: 'var(--yellow-d)', background: 'var(--yellow-l)' }}>Chưa có đáp án</span>}
          </div>
        )}
      </The>
    </a>
  )
}

const IcNho = { fontSize: 22, lineHeight: 1 } as const

export function Home() {
  const [ds, setDs] = useState<ThongBai[] | null>(null)
  const daXem = useDaXemHd()
  const [dangMau, setDangMau] = useState(false)

  useEffect(() => {
    let s = true
    const tai = async () => {
      const bs = (await dsBai()).sort((a, b) => b.sua - a.sua)
      const ts = await Promise.all(bs.map(thongKeBai))
      if (s) setDs(ts)
    }
    tai()
    const bo = dangKyThayDoi(tai)
    return () => { s = false; bo() }
  }, [])

  // Lần đầu mở app → chuyển sang hướng dẫn
  useEffect(() => {
    if (daXem === false) location.hash = '#/huong-dan'
  }, [daXem])

  const thuMau = async () => {
    setDangMau(true)
    try {
      const r = await fetch('/mau/bai-mau.json')
      const m = await r.json()
      const bai: Bai = {
        id: crypto.randomUUID(), ten: m.ten, mon: m.mon, lop: m.lop ?? [],
        phieu: m.phieu, khuon: m.khuon,
        diem: diemMau('toan-2025', m.soCau),
        dapAn: m.dapAn ?? [], hocSinh: m.hocSinh ?? [],
        tao: Date.now(), sua: Date.now(),
      }
      await luuBai(bai)
      location.hash = `#/bai/${bai.id}`
    } finally { setDangMau(false) }
  }

  const ganNhat = ds?.[0]
  const thu = THU[new Date().getDay()]

  return (
    <ManHinh dau={
      <Dau tieuDe="Chamthi365" phu="Chấm phiếu trắc nghiệm" phai={
        <a href="#/tai-khoan" className="nut nho nhat" title="Tài khoản">☁</a>
      } />
    }>
      <div className="hang" style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <div>
          <div style={{ font: `800 20px/1.2 var(--f-head)` }}>Chào quý thầy cô · {thu}</div>
          <div className="mo nho">{ds?.length ? `${ds.length} bài chấm` : 'Đưa phiếu vào là có điểm'}</div>
        </div>
        <a href="#/huong-dan" className="nut nho nhat" title="Xem lại hướng dẫn">?</a>
      </div>

      <div className="khoi">
        <NutDen to="#/tao" kieu="xanh" style={{ width: '100%' }}>＋ Tạo bài chấm</NutDen>
      </div>

      {ds === null ? <p className="mo giua">Đang mở…</p> : ds.length === 0 ? (
        <The className="giua khoi">
          <div style={{ fontSize: 40 }}>📝</div>
          <h2>Chưa có bài chấm nào</h2>
          <p className="mo">Tạo bài chấm, chọn mẫu phiếu, nhập đáp án rồi chấm từ ảnh chụp hoặc tệp PDF máy scan.</p>
          <NutDen to="#/tao" kieu="xanh">Tạo bài chấm đầu tiên</NutDen>
          <div className="cach" />
          <Nut kieu="nhat" onClick={thuMau} disabled={dangMau}>{dangMau ? 'Đang tạo…' : 'Thử với bài mẫu'}</Nut>
        </The>
      ) : (
        <>
          <Muc>Bài gần nhất</Muc>
          {ganNhat && <TheBai t={ganNhat} />}
          <div className="hang khoi">
            <NutDen to={ganNhat ? `#/cham/${ganNhat.bai.id}` : '#/'} kieu="vang" style={{ flex: 1 }}>Chấm tiếp</NutDen>
            <NutDen to={ganNhat ? `#/cham/${ganNhat.bai.id}?tep=1` : '#/'} kieu="nhat" style={{ flex: 1 }}>Chấm PDF · tệp máy scan</NutDen>
          </div>
          {ds.length > 1 && <Muc>Tất cả bài chấm</Muc>}
          {ds.slice(1).map(t => <TheBai key={t.bai.id} t={t} />)}
        </>
      )}

      <Muc>Công cụ</Muc>
      <div className="hang khoi" style={{ flexWrap: 'wrap' }}>
        <NutDen to="#/tron-de" kieu="tim" style={{ flex: 1, minWidth: 140 }}><span style={IcNho}>⧉</span> Trộn đề Word</NutDen>
        <NutDen to="#/in-phieu" kieu="nhat" style={{ flex: 1, minWidth: 140 }}><span style={IcNho}>🖨</span> In phiếu · 819 mẫu</NutDen>
        <NutDen to="#/danh-sach" kieu="nhat" style={{ flex: 1, minWidth: 140 }}><span style={IcNho}>👥</span> Danh sách · nạp Excel lớp</NutDen>
        <NutDen to="#/bai-mau" kieu="nhat" style={{ flex: 1, minWidth: 140 }}><span style={IcNho}>✨</span> Bài mẫu · phiếu quét thật</NutDen>
      </div>
      <p className="mo nho giua">Trộn đề: giữ hình, công thức MathType · tải các mã đề + đáp án, chuyển thẳng sang chấm</p>
      <CaiApp />
    </ManHinh>
  )
}
