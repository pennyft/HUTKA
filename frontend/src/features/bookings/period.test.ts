import { describe, expect, it } from 'vitest'
import { formatMoment, formatPeriod } from './period'

describe('period', () => {
  it('момент', () => {
    expect(formatMoment('2026-10-20T14:05:00Z', 'UTC')).toBe('20 окт, 14:05')
    expect(formatMoment('мусор')).toBe('')
  })
  it('период в один день', () => {
    expect(formatPeriod('2026-10-20T10:00:00Z', '2026-10-20T12:00:00Z', 'UTC')).toBe('20 окт, 10:00–12:00')
  })
})
