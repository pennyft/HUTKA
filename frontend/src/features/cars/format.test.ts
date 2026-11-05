import { describe, expect, it } from 'vitest'
import { formatCarsCount, formatDistance, formatMileage, formatPrice, formatRating, formatReviewDate, formatSeats, plural } from './format'

describe('formatPrice', () => {
  it('убирает лишние нули и ставит запятую', () => {
    expect(formatPrice(7.5)).toBe('7,5')
    expect(formatPrice(14)).toBe('14')
    expect(formatPrice(7.25)).toBe('7,25')
  })
})

describe('formatRating', () => {
  it('один знак после запятой', () => {
    expect(formatRating(4.8)).toBe('4,8')
    expect(formatRating(5)).toBe('5')
  })
})

describe('formatDistance', () => {
  it('до километра показывает метры, округляя до 10', () => {
    expect(formatDistance(0.434)).toBe('430 м')
    expect(formatDistance(0.001)).toBe('10 м')
  })
  it('от километра показывает километры', () => {
    expect(formatDistance(1.24)).toBe('1,2 км')
    expect(formatDistance(12)).toBe('12 км')
  })
})

describe('plural', () => {
  it('склоняет, включая 11–14', () => {
    expect(formatCarsCount(1)).toBe('1 машина')
    expect(formatCarsCount(3)).toBe('3 машины')
    expect(formatCarsCount(5)).toBe('5 машин')
    expect(formatCarsCount(11)).toBe('11 машин')
    expect(formatCarsCount(21)).toBe('21 машина')
    expect(formatCarsCount(112)).toBe('112 машин')
    expect(plural(22, ['а', 'б', 'в'])).toBe('б')
  })
  it('места', () => {
    expect(formatSeats(2)).toBe('2 места')
    expect(formatSeats(5)).toBe('5 мест')
  })
})

describe('formatMileage', () => {
  it('разделяет тысячи пробелом', () => {
    expect(formatMileage(84000).replace(/\s/g, ' ')).toBe('84 000 км')
    expect(formatMileage(950)).toBe('950 км')
  })
})

describe('formatReviewDate', () => {
  const now = new Date('2026-10-20T12:00:00Z')
  it('в этом году без года', () => {
    expect(formatReviewDate('2026-10-12T12:00:00Z', now)).toBe('12 октября')
  })
  it('в прошлых годах с годом', () => {
    expect(formatReviewDate('2025-03-05T12:00:00Z', now)).toBe('5 марта 2025 г.')
  })
  it('мусорная дата даёт пустую строку', () => {
    expect(formatReviewDate('не дата', now)).toBe('')
  })
})
