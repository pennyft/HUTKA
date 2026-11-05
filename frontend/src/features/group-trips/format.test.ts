import { describe, expect, it } from 'vitest'
import { formatTripDate, participantsText } from './format'

describe('group-trips format', () => {
  it('дата поездки без сдвига по поясу', () => {
    expect(formatTripDate('2026-10-25')).toBe('25 октября, вс')
  })
  it('мусорная дата возвращается как есть', () => {
    expect(formatTripDate('скоро')).toBe('скоро')
  })
  it('участники', () => {
    expect(participantsText(3, 5)).toBe('3 из 5')
  })
})
