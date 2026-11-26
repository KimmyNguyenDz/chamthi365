import { useEffect, useMemo, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { Nut, NutDen } from '../components/Nut'
import { The, Muc } from '../components/The'
import { ChonPhieu } from '../components/ChonPhieu'
import { QuetPhieu } from '../components/QuetPhieu'
import { dsPhieu, layBai, luuBai, dsLop } from '../lib/db'
import { diemMau, dinhDangDiem } from '../lib/diem'
import { docDanhSachExcel, vietDanhSachExcelBytes } from '../lib/excel'
import { taiTep } from '../lib/tai'
import { thongBao } from '../lib/thongBao'
import { idMoi } from '../lib/id'
import { Camera } from 'lucide-react'
import { mucLuc, nhanCau, tomTat, urlAnh } from '../lib/thuvien'
import type { Bai, Diem, HocSinh, Lop, MauPhieu } from '../types'

const MON = ['Toán', 'Vật lí', 'Hóa học', 'Sinh học', 'Ngữ văn', 'Tiếng Anh', 'Lịch sử', 'Địa lí', 'GDCD', 'Tin học', 'KHTN', 'KHXH']

type Hanh = {
  mau: MauPhieu | null
  ten: string; mon: string; lop: string
  boSbd: boolean
  soCau: { p1: number; p2: number; p3: number }
  diem: Diem
  hocSinh: HocSinh[]
}

function OSo({ nhan, v, on, buoc = 0.25, min = 0, max = 99 }: { nhan: string; v: number; on: (n: number) => void; buoc?: number; min?: number; max?: number }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 92, flex: 1 }}>
      <span className="o-nhan" style={{ margin: 0 }}>{nhan}</span>
      <input className="o-vao" type="number" inputMode="decimal" step={buoc} min={min} max={max} value={v}
        onChange={e => { const n = +e.target.value.replace(',', '.'); if (!isNaN(n)) on(n) }} />
    </label>
  )
}

function Stepper({ v, on, max }: { v: number; on: (n: number) => void; max: number }) {
  const dat = (n: number) => on(Math.max(0, Math.min(max, n)))
  return (
    <span className="stepper">
      <button type="button" onClick={() => dat(v - 1)}>−</button>
      <span className="gia">{v}</span>
      <button type="button" onClick={() => dat(v + 1)}>+</button>
    </span>
  )
}

export function TaoBai({ id }: { id?: string }) {
  const [b, setB] = useState<Hanh | null>(null)
  const [buoc, setBuoc] = useState(0)
  const [quet, setQuet] = useState(false)
  const [loi, setLoi] = useState('')
  const [sua, setSua] = useState(false)      // chế độ sửa
  const [khoaMau, setKhoaMau] = useState(false) // đã chấm ≥1 phiếu → khóa đổi mẫu
  const [dangLuu, setDangLuu] = useState(false)
  const [lopDaCo, setLopDaCo] = useState<Lop[]>([])
  const [lopChon, setLopChon] = useState('') // id lớp đã lưu đang dùng

  // Tải bài khi sửa
  useEffect(() => {
    if (!id) return
    ;(async () => {
      const cu = await layBai(id)
      if (!cu) { setLoi('Bài chấm này không còn trong máy'); return }
      setSua(true)
      const daCham = (await dsPhieu(id)).some(p => p.ok)
      setKhoaMau(daCham)
      // mau chỉ có mã — lưu lại mã vào trường phieu; cần MauPhieu đầy đủ → tải mục lục tìm
      const m = (await mucLuc()).find(x => x.ma === cu.phieu) ?? null
      setB({
        mau: m, ten: cu.ten, mon: cu.mon, lop: cu.lop.join(', '), boSbd: !!cu.boSbd,
        soCau: { ...cu.diem.soCau }, diem: { ...cu.diem, p2: [...cu.diem.p2] }, hocSinh: [...cu.hocSinh],
      })
      setBuoc(1)
    })()
  }, [id])

  // Tải danh sách lớp đã lưu khi vào bước 3
  useEffect(() => { if (buoc === 2) dsLop().then(setLopDaCo) }, [buoc])

  const m = b?.mau ?? null
  const soCauIn = useMemo(() => (m ? { p1: m.p1, p2: m.p2, p3: m.p3 } : null), [m])

  const chonMau = (x: MauPhieu) => {
    // mặc định theo format đề 2025: 12 câu P.I + 4 câu P.II + 6 câu P.III (không vượt số câu in)
    const soCau = { p1: Math.min(12, x.p1), p2: Math.min(4, x.p2), p3: Math.min(6, x.p3) }
    setB(v => ({
      mau: x, ten: v?.ten ?? '', mon: v?.mon ?? 'Toán', lop: v?.lop ?? '', boSbd: v?.boSbd ?? false,
      soCau, diem: diemMau('toan-2025', soCau), hocSinh: v?.hocSinh ?? [],
    }))
    setQuet(false)
    setBuoc(1)
  }

  const luu = async (v = b) => {
    if (!v?.mau) return
    setDangLuu(true)
    try {
      const cu = id ? await layBai(id) : undefined
      const bai: Bai = {
        id: id ?? idMoi(),
        ten: v.ten.trim() || 'Bài chấm',
        mon: v.mon, lop: v.lop.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean),
        phieu: v.mau.ma, khuon: v.mau.khuon[0].khuon,
        diem: { ...v.diem, soCau: { ...v.soCau } },
        dapAn: cu?.dapAn ?? [], hocSinh: v.hocSinh,
        boSbd: v.boSbd || undefined,
        tao: cu?.tao ?? Date.now(), sua: Date.now(),
      }
      await luuBai(bai)
      location.hash = sua ? `#/bai/${bai.id}` : `#/bai/${bai.id}/dap-an`
    } finally { setDangLuu(false) }
  }

  const napLop = async (f: File) => {
    try {
      const hs = await docDanhSachExcel(await f.arrayBuffer())
      if (!hs.length) { setLoi('Tệp không có học sinh nào'); return }
      const v = b && { ...b, hocSinh: hs }
      setB(v)
      setLoi('')
      // Nạp xong → tự lưu bài và sang màn tiếp theo
      thongBao(`Đã nạp ${hs.length} học sinh`)
      await luu(v)
    } catch (e) { setLoi(String((e as Error)?.message ?? e)) }
  }

  const chonLop = async (l: Lop) => {
    const lopSet = new Set(b?.lop.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean))
    lopSet.add(l.ten)
    const v = b && { ...b, hocSinh: l.hocSinh, lop: [...lopSet].join(', ') }
    setB(v)
    setLopChon(l.id)
    setLoi('')
    thongBao(`Đã chọn lớp ${l.ten} — ${l.hocSinh.length} học sinh`)
    await luu(v)
  }

  if (loi && !b) return <ManHinh><p className="mo giua khoi">{loi}</p><div className="giua"><NutDen to="#/" kieu="nhat">Về danh sách bài chấm</NutDen></div></ManHinh>
  if (id && !b) return <ManHinh><p className="mo giua khoi">Đang mở…</p></ManHinh>

  const de2 = buoc === 1 && m
  const pills = ['Chọn phiếu', 'Thông tin & điểm', 'Danh sách HS']
  return (
    <ManHinh rong={buoc > 0} dau={<Dau tieuDe={sua ? 'Sửa bài chấm' : 'Tạo bài chấm'} phu="sửa lại được sau" />}>
      {/* thanh bước dạng pills */}
      <div className="buoc-pills">
        {pills.map((t, i) => (
          <span key={t} className={`buoc-pill ${i === buoc ? 'on' : i < buoc ? 'xong' : ''}`}>
            <span className="n">{i < buoc ? '✓' : i + 1}</span>{t}
          </span>
        ))}
      </div>

      {/* ---------- Bước 1: chọn mẫu phiếu ---------- */}
      {buoc === 0 && (
        <>
          <div className="hang khoi">
            <Nut kieu="nhat" onClick={() => setQuet(true)}><Camera /> Quét phiếu — máy tìm giúp</Nut>
          </div>
          <ChonPhieu chon={m?.ma} onChon={chonMau} />
          {quet && <QuetPhieu onChon={chonMau} onDong={() => setQuet(false)} />}
        </>
      )}

      {/* ---------- Bước 2: thông tin & điểm — 3 cột ---------- */}
      {de2 && m && b && (
        <>
          <div className="tb3">
            <The className="khoi">
              <h3 className="the-td"><span className="so-dau">1</span>Bài kiểm tra</h3>
              <label className="o-nhan">Tên bài</label>
              <input className="o-vao" value={b.ten} placeholder="Ví dụ: KT 15 phút Toán 10A1" onChange={e => setB({ ...b, ten: e.target.value })} />

              <label className="o-nhan">Môn</label>
              <div className="hang" style={{ flexWrap: 'wrap', gap: 6 }}>
                {MON.map(x => <button key={x} className={`chip ${b.mon === x ? 'vang' : ''}`} onClick={() => setB({ ...b, mon: x })}>{x}</button>)}
              </div>
              <input className="o-vao" style={{ marginTop: 8 }} value={b.mon} placeholder="Hoặc gõ môn khác…" onChange={e => setB({ ...b, mon: e.target.value })} />

              <label className="o-nhan">Lớp (cách nhau dấu phẩy)</label>
              <input className="o-vao" value={b.lop} placeholder="10A1, 10A2…" onChange={e => setB({ ...b, lop: e.target.value })} />
            </The>

            <The className="khoi">
              <h3 className="the-td"><span className="so-dau">2</span>Phiếu trả lời</h3>
              <div className="hang" style={{ alignItems: 'flex-start' }}>
                <img src={urlAnh(m)} alt="" style={{ width: 64, height: 88, objectFit: 'cover', border: '2px solid var(--ink)', borderRadius: 8 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b className="nho">{m.ten}</b>
                  <div className="mo nho">{nhanCau(m)} · {tomTat(m)}</div>
                  <div className="hang" style={{ marginTop: 8, flexWrap: 'wrap', gap: 6 }}>
                    {!khoaMau && <Nut kieu="nhat" nho onClick={() => setBuoc(0)}>Đổi phiếu</Nut>}
                    {khoaMau && <span className="mo nho">Đã chấm — không đổi mẫu</span>}
                  </div>
                </div>
              </div>

              {m.so_sbd > 0 && (
                <label className="con-tat" style={{ marginTop: 10 }}>
                  <input type="checkbox" checked={b.boSbd} onChange={e => setB({ ...b, boSbd: e.target.checked })} />
                  <span className="nho">Phiếu không có lưới SBD (nhập tên tay khi chấm)</span>
                </label>
              )}

              <label className="o-nhan">Số câu dùng (≤ số câu in trên phiếu)</label>
              <div style={{ display: 'grid', gap: 8 }}>
                {([['Phần I — trắc nghiệm', 'p1'], ['Phần II — đúng sai', 'p2'], ['Phần III — trả lời ngắn', 'p3']] as const).map(([nhan, k]) => (
                  <div key={k} className="hang" style={{ justifyContent: 'space-between' }}>
                    <span className="nho mo">{nhan} <span className="mo">(≤{soCauIn![k]})</span></span>
                    <Stepper v={b.soCau[k]} max={soCauIn![k]} on={n => setB({ ...b, soCau: { ...b.soCau, [k]: n } })} />
                  </div>
                ))}
              </div>
            </The>

            <The className="khoi">
              <h3 className="the-td"><span className="so-dau">3</span>Cách tính điểm</h3>
              <div className="dd">
                {([
                  ['Phần I · trắc nghiệm', b.soCau.p1, b.diem.p1, (n: number) => ({ p1: n })],
                  ['Phần II · đúng sai', b.soCau.p2, b.diem.p2[4] ?? 0, (n: number) => ({ p2: [0, +(n * .1).toFixed(4), +(n * .25).toFixed(4), +(n * .5).toFixed(4), n] })],
                  ['Phần III · trả lời ngắn', b.soCau.p3, b.diem.p3, (n: number) => ({ p3: n })],
                ] as const).map(([nhan, cau, diemCau, ghi], i) => (
                  <div key={nhan} className="dd-dong">
                    <span className="dd-p">{nhan}</span>
                    <span className="dd-c">{cau} câu</span>
                    <span className="dd-dau">×</span>
                    <label className="dd-inp">
                      <input className="o-vao" type="number" inputMode="decimal" step={0.05} min={0} max={9.99} value={diemCau}
                        onChange={e => { const n = +e.target.value.replace(',', '.'); if (!isNaN(n)) setB({ ...b, diem: { ...b.diem, mau: 'tuy-chinh', ...ghi(n) } }) }} />
                      <span>đ</span>
                    </label>
                    <span className="dd-dau">=</span>
                    <b className="dd-t">{dinhDangDiem(cau * diemCau)}đ</b>
                    {i === 1 && (
                      <p className="dd-y">Mỗi câu theo số ý đúng — {b.diem.p2.slice(1).map((x, j) => `${j + 1}ý ${dinhDangDiem(x)}đ`).join(' · ')}</p>
                    )}
                  </div>
                ))}
                <div className="dd-dong">
                  <span className="dd-p">Tự luận</span>
                  <span className="dd-c">chấm tay</span>
                  <span className="dd-dau">+</span>
                  <label className="dd-inp">
                    <input className="o-vao" type="number" inputMode="decimal" step={0.25} min={0} max={9.99} value={b.diem.tuLuan}
                      onChange={e => { const n = +e.target.value.replace(',', '.'); if (!isNaN(n)) setB({ ...b, diem: { ...b.diem, mau: 'tuy-chinh', tuLuan: n } }) }} />
                    <span>đ</span>
                  </label>
                  <span className="dd-dau">=</span>
                  <b className="dd-t">{dinhDangDiem(b.diem.tuLuan)}đ</b>
                </div>
              </div>
              <details className="dd-nc">
                <summary>Nâng cao — điểm trừ &amp; làm tròn</summary>
                <div className="hang" style={{ flexWrap: 'wrap', marginTop: 8 }}>
                  <OSo nhan="Trừ câu P.I sai" v={b.diem.truP1} on={n => setB({ ...b, diem: { ...b.diem, truP1: n } })} />
                  <OSo nhan="Làm tròn đến" v={b.diem.lamTron} buoc={0.05} on={n => setB({ ...b, diem: { ...b.diem, lamTron: n } })} />
                </div>
              </details>
              {(() => {
                const d = b.diem
                const td = b.soCau.p1 * d.p1 + b.soCau.p2 * (d.p2[4] ?? 0) + b.soCau.p3 * d.p3 + d.tuLuan
                const tron = d.lamTron > 0 ? Math.round(td / d.lamTron) * d.lamTron : td
                const khac = Math.abs(tron - 10) > 1e-9
                return (
                  <div className={`tong-bar ${khac ? 'khac' : ''}`}>
                    <span>Tổng{khac ? ` — P.I ${dinhDangDiem(b.soCau.p1 * d.p1)} + P.II ${dinhDangDiem(b.soCau.p2 * (d.p2[4] ?? 0))} + P.III ${dinhDangDiem(b.soCau.p3 * d.p3)} + TL ${dinhDangDiem(d.tuLuan)}` : ''}</span>
                    <b>{dinhDangDiem(tron)} đ</b>
                  </div>
                )
              })()}
            </The>
          </div>

          <div className="hang khoi">
            <Nut kieu="nhat" onClick={() => setBuoc(0)}>Bước trước</Nut>
            <Nut kieu="xanh" style={{ flex: 1 }} onClick={() => setBuoc(2)}>Tiếp →</Nut>
          </div>
        </>
      )}

      {/* ---------- Bước 3: danh sách lớp + lưu ---------- */}
      {buoc === 2 && b && (
        <>
          <Muc>Danh sách học sinh (tùy chọn)</Muc>
          {!!lopDaCo.length && (
            <The pang className="khoi">
              <p className="mo nho" style={{ marginTop: 0 }}><b>Chọn lớp đã lưu</b> — bấm là xong, không cần nạp lại:</p>
              <div className="hang" style={{ flexWrap: 'wrap' }}>
                {lopDaCo.map(l => (
                  <button key={l.id} className={`chip ${lopChon === l.id ? 'bat' : ''}`} disabled={dangLuu}
                    onClick={() => chonLop(l)}>{l.ten} · {l.hocSinh.length} HS</button>
                ))}
              </div>
            </The>
          )}
          <The pang className="khoi">
            {b.hocSinh.length ? (
              <p><b>{b.hocSinh.length}</b> học sinh — ví dụ: {b.hocSinh.slice(0, 3).map(h => h.ten).join(', ')}…</p>
            ) : (
              <p className="mo">Nạp danh sách lớp từ Excel để máy ghi đúng tên em theo số báo danh. Bỏ qua cũng được.</p>
            )}
            <div className="hang">
              <label className="nut nhat" style={{ cursor: 'pointer' }}>
                Nạp Excel lớp
                <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) napLop(f); e.target.value = '' }} />
              </label>
              <Nut kieu="nhat" onClick={() => taiTep(vietDanhSachExcelBytes(), 'danh-sach-lop-mau.xlsx')}>Tải file mẫu</Nut>
              <NutDen to="#/danh-sach" kieu="nhat">Quản lý lớp</NutDen>
            </div>
            <p className="mo nho" style={{ marginBottom: 0 }}>Tệp cần cột “SBD” (bắt buộc), “Họ và tên”, “Ngày sinh” và “Lớp” (tuỳ chọn). File mẫu có sẵn hướng dẫn điền.</p>
          </The>
          {loi && <p style={{ color: 'var(--red-d)' }}>{loi}</p>}
          <div className="hang khoi">
            <Nut kieu="nhat" onClick={() => setBuoc(1)}>Bước trước</Nut>
            <Nut kieu="xanh" style={{ flex: 1 }} disabled={dangLuu} onClick={() => luu()}>{dangLuu ? 'Đang lưu…' : sua ? 'Lưu bài chấm' : 'Tạo bài — sang nhập đáp án'}</Nut>
          </div>
        </>
      )}
    </ManHinh>
  )
}
