import { describe, expect, test } from 'vitest'
import { clipPx, tachClip } from './pdf'
import type { KhuonTep } from '../types'

// A4 ngang 842x595pt render ở ~200dpi → 2339x1653px; clip nửa trên [0,0,842,297.5]
describe('tachClip — tách 2 phiếu/trang theo clip pt→px', () => {
  const kts: KhuonTep[] = [
    { trang: 0, clip: [0, 0, 842, 297.5], khuon: 'a' },
    { trang: 0, clip: [0, 297.5, 842, 297.5], khuon: 'b' },
  ]
  test('clip null → cả trang', () => {
    expect(clipPx({ trang: 0, clip: null, khuon: 'x' }, 842, 595, 2339, 1653)).toEqual([0, 0, 2339, 1653])
  })
  test('clip pt → px đúng tỉ lệ, chừa mép 2px', () => {
    const [x, y, w, h] = clipPx(kts[0], 842, 595, 2339, 1653)
    expect(x).toBe(0)
    expect(y).toBe(0)
    expect(w).toBe(2339) // clip tràn chiều ngang → clamp về wPx
    expect(h).toBeCloseTo(297.5 * (1653 / 595) + 4, 0)
  })
  test('trang 0 trả 2 vùng, trang khác 0', () => {
    expect(tachClip(kts, 0, 842, 595, 2339, 1653)).toHaveLength(2)
    expect(tachClip(kts, 1, 842, 595, 2339, 1653)).toHaveLength(0)
  })
})
