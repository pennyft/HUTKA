import { describe, expect, it } from 'vitest'
import { formatHazardRange, formatMoney } from './format'

describe('formatMoney', () => {
  it('две цифры после запятой', () => {
    expect(formatMoney(15)).toBe('15,00')
    expect(formatMoney(11.25)).toBe('11,25')
    expect(formatMoney(333.33)).toBe('333,33')
  })
})

describe('formatHazardRange', () => {
  it('в пределах суток', () => {
    expect(formatHazardRange('2026-10-20T14:00:00Z', '2026-10-20T18:00:00Z', 'UTC')).toBe('20 окт, 14:00–18:00')
  })
  it('через полночь', () => {
    expect(formatHazardRange('2026-10-20T22:00:00Z', '2026-10-21T03:00:00Z', 'UTC')).toBe('20 окт, 22:00 – 21 окт, 03:00')
  })
  it('мусор даёт пустую строку', () => {
    expect(formatHazardRange('x', 'y')).toBe('')
  })
})
