import { renderToString } from 'react-dom/server'
import { expect, test } from 'vitest'
import { HuongDan } from './screens/HuongDan'
import { tachRoute } from './App'

test('huong-dan render', () => {
  const s = renderToString(<HuongDan />)
  expect(s).toContain('Chào mừng quý thầy cô')
})
test('tachRoute', () => {
  expect(tachRoute('#/')).toEqual({ ten: '', id: null })
  expect(tachRoute('#/bai/abc')).toEqual({ ten: 'bai', id: 'abc' })
  expect(tachRoute('#/cham/x?tep=1')).toEqual({ ten: 'cham', id: 'x' })
})
