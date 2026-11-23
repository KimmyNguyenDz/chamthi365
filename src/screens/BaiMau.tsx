import { useEffect, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { The } from '../components/The'
import { Nut } from '../components/Nut'
import { luuBai } from '../lib/db'
import { diemMau } from '../lib/diem'
import type { Bai } from '../types'

const ANH = ['/mau/phieu-1.webp', '/mau/phieu-2.webp', '/mau/phieu-3.webp', '/mau/phieu-4.webp']

/** Bài mẫu: tạo bài chấm demo + trình chiếu 4 phiếu quét thật + tải PDF mẫu */
export function BaiMau() {
  const [i, setI] = useState(0)
  const [dangTao, setDangTao] = useState(false)
  const [tc, setTc] = useState(true)

  useEffect(() => {
    if (!tc) return
    const t = setInterval(() => setI(x => (x + 1) % ANH.length), 1600)
    return () => clearInterval(t)
  }, [tc])

  const tao = async () => {
    setDangTao(true)
    try {
      const m = await (await fetch('/mau/bai-mau.json')).json()
      const bai: Bai = {
        id: crypto.randomUUID(), ten: m.ten, mon: m.mon, lop: m.lop ?? [],
        phieu: m.phieu, khuon: m.khuon,
        diem: diemMau('toan-2025', m.soCau),
        dapAn: m.dapAn ?? [], hocSinh: m.hocSinh ?? [],
        tao: Date.now(), sua: Date.now(),
      }
      await luuBai(bai)
      location.hash = `#/bai/${bai.id}`
    } finally { setDangTao(false) }
  }

  return (
    <ManHinh dau={<Dau tieuDe="Bài mẫu" phu="Đề Toán 2025 · 12-4-6 · 4 mã đề" />}>
      <The>
        <h2>Phiếu mẫu đã quét</h2>
        <div className="giua" onClick={() => setTc(v => !v)} style={{ cursor: 'pointer' }}>
          <img src={ANH[i]} alt={`Phiếu mẫu ${i + 1}`} style={{ maxWidth: '100%', borderRadius: 10, border: 'var(--bo)' }} />
          <p className="mo nho">{i + 1}/4 — {tc ? 'bấm để dừng' : 'bấm để chạy tiếp'}</p>
        </div>
      </The>
      <The>
        <h2>Dùng thử</h2>
        <p className="mo">Tạo bài chấm mẫu với sẵn đáp án 4 mã đề và danh sách lớp — sau đó chấm thử ngay 4 ảnh trên (lưu về máy rồi Chấm PDF·tệp, hoặc mở trên máy khác để quay camera).</p>
        <div className="hang" style={{ flexWrap: 'wrap' }}>
          <Nut kieu="xanh" onClick={tao} disabled={dangTao}>{dangTao ? 'Đang tạo…' : 'Tạo bài mẫu'}</Nut>
          <a className="nut nhat" href="/mau/phieu-mau.pdf" download>Tải PDF 4 phiếu</a>
        </div>
      </The>
    </ManHinh>
  )
}
