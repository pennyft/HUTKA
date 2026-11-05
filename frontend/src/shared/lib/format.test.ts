import { describe, expect, it } from 'vitest'
import { formatMoney } from './format'

describe('formatMoney', () => {
  it('принимает число и строку одинаково', () => {
    expect(formatMoney('10.5')).toBe(formatMoney(10.5))
  })
})
