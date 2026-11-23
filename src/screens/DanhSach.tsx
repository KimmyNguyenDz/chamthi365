import { useEffect, useState } from 'react'
import { Dau, ManHinh } from '../components/ManHinh'
import { The } from '../components/The'
import { dsBai } from '../lib/db'
import type { Bai } from '../types'

/** Danh sách lớp theo từng bài chấm — chọn bài để nạp/xem DS học sinh */
export function DanhSach() {
  const [ds, setDs] = useState<Bai[] | null>(null)
  useEffect(() => { dsBai().then(setDs) }, [])
  return (
    <ManHinh dau={<Dau tieuDe="Danh sách lớp" phu="Nạp Excel DS học sinh vào bài chấm" />}>
      {ds === null ? <p className="mo giua">Đang mở…</p> : !ds.length ? (
        <The className="giua"><p className="mo">Chưa có bài chấm nào — tạo bài trước rồi nạp danh sách lớp.</p></The>
      ) : ds.map(b => (
        <The key={b.id} className="khoi" onClick={() => { location.hash = `#/bai/${b.id}/hoc-sinh` }}>
          <div className="hang" style={{ justifyContent: 'space-between' }}>
            <b>{b.ten}</b>
            <span className="mo nho">{b.hocSinh.length ? `${b.hocSinh.length} HS` : 'chưa có DS'}</span>
          </div>
          <p className="mo nho" style={{ margin: '4px 0 0' }}>{b.mon} · {b.lop.join(', ') || '—'}</p>
        </The>
      ))}
    </ManHinh>
  )
}
