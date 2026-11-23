import { useState } from 'react'
import type { DapAn } from '../types'

const CHU = ['A', 'B', 'C', 'D'] as const

function OChu({ v, bat, on }: { v: string; bat: boolean; on: () => void }) {
  return (
    <button className={`chip ${bat ? 'bat' : ''}`}
      style={{ width: 34, height: 34, padding: 0, justifyContent: 'center', fontWeight: 800 }}
      onClick={on}>{v}</button>
  )
}

/** Đổi ký tự thứ i trong chuỗi độ dài n (mặc định trống) */
function datKy(s: string, i: number, n: number, k: string): string {
  const a = s.padEnd(n, ' ').split('')
  a[i] = k
  return a.join('').trimEnd()
}

/**
 * Nhập đáp án cho 1 mã đề.
 * P1: A/B/C/D bấm nhiều lần được (đa đáp án), * huỷ câu — bấm là nhảy câu sau.
 * P2: mỗi ý một ô, bấm vòng trống→Đ→S.
 * P3: gõ đáp số, "0,5/1" nhiều đáp số, "*" huỷ.
 */
export function NhapDapAn({ soCau, value, onChange }: { soCau: { p1: number; p2: number; p3: number }; value: DapAn; onChange: (d: DapAn) => void }) {
  const [nhay, setNhay] = useState(0)
  const p1 = (i: number) => value.p1[i] ?? ''
  const p2 = (i: number) => value.p2[i] ?? ''

  const setP1 = (i: number, s: string) => {
    const a = [...value.p1]
    a[i] = s
    onChange({ ...value, p1: a })
  }
  const setP2 = (i: number, s: string) => {
    const a = [...value.p2]
    a[i] = s
    onChange({ ...value, p2: a })
  }
  const setP3 = (i: number, s: string) => {
    const a = [...value.p3]
    a[i] = s
    onChange({ ...value, p3: a })
  }

  const batP1 = (i: number, c: string) => {
    const g = p1(i)
    if (c === '*') { setP1(i, g === '*' ? '' : '*'); return }
    if (g === '*') { setP1(i, c); return }
    // đã có 1 chữ → bấm thêm = đa đáp án; bấm lại chính nó = bỏ
    const s = g.includes(c) ? g.replace(c, '') : (g + c).split('').sort().join('')
    setP1(i, s)
    if (!g && s) setNhay(i + 1)
  }

  const vongY = (i: number, y: number) => {
    const s = p2(i).padEnd(4, ' ')
    const g = s[y]
    const k = g === 'Đ' ? 'S' : g === 'S' ? ' ' : 'Đ'
    setP2(i, datKy(s, y, 4, k))
  }

  return (
    <div>
      {soCau.p1 > 0 && (
        <>
          <div className="o-nhan">Phần I — bấm chữ là tự nhảy câu sau; bấm thêm chữ = nhiều đáp án; * = huỷ câu</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: 6 }}>
            {Array.from({ length: soCau.p1 }, (_, i) => (
              <div key={i} className="hang" style={{ padding: '4px 8px', borderRadius: 10, background: i === nhay ? 'var(--yellow-l)' : 'transparent' }}>
                <span className="mo" style={{ width: 24, textAlign: 'right' }}>{i + 1}</span>
                {CHU.map(c => <OChu key={c} v={c} bat={p1(i).includes(c)} on={() => batP1(i, c)} />)}
                <OChu v="*" bat={p1(i) === '*'} on={() => batP1(i, '*')} />
              </div>
            ))}
          </div>
        </>
      )}

      {soCau.p2 > 0 && (
        <>
          <div className="o-nhan">Phần II — mỗi ý một ô, bấm vòng trống → Đ → S</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 6 }}>
            {Array.from({ length: soCau.p2 }, (_, i) => (
              <div key={i} className="hang" style={{ padding: '4px 8px' }}>
                <span className="mo" style={{ width: 24, textAlign: 'right' }}>{i + 1}</span>
                {(['a', 'b', 'c', 'd'] as const).map((y, j) => {
                  const g = p2(i).padEnd(4, ' ')[j]
                  return (
                    <button key={y} className={`chip ${g === 'Đ' || g === 'S' ? 'bat' : ''}`}
                      style={{ width: 44, height: 34, padding: 0, justifyContent: 'center', background: g === 'Đ' ? 'var(--green-l)' : g === 'S' ? 'var(--red-l)' : undefined }}
                      onClick={() => vongY(i, j)}>
                      <span className="mo" style={{ fontSize: 10 }}>{y}</span>{g === ' ' ? '·' : g}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {soCau.p3 > 0 && (
        <>
          <div className="o-nhan">Phần III — đáp số; nhiều đáp số đúng ghi 0,5/1; * huỷ</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 6 }}>
            {Array.from({ length: soCau.p3 }, (_, i) => (
              <label key={i} className="hang" style={{ padding: '2px 0' }}>
                <span className="mo" style={{ width: 24, textAlign: 'right' }}>{i + 1}</span>
                <input className="o-vao" style={{ minHeight: 38, padding: '4px 10px' }}
                  value={value.p3[i] ?? ''} onChange={e => setP3(i, e.target.value)} />
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
