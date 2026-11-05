import { describe, expect, it } from 'vitest'
import { defaultStart, formatDuration, fromLocalParts, roundUp, toLocalParts, validateRange } from './time'

const local = (y: number, mo: number, d: number, h: number, mi: number) => new Date(y, mo - 1, d, h, mi)

describe('roundUp', () => {
  it('округляет вверх до 15 минут', () => {
    expect(roundUp(local(2026, 10, 20, 10, 1))).toEqual(local(2026, 10, 20, 10, 15))
    expect(roundUp(local(2026, 10, 20, 10, 15))).toEqual(local(2026, 10, 20, 10, 15))
    expect(roundUp(local(2026, 10, 20, 10, 46))).toEqual(local(2026, 10, 20, 11, 0))
  })
})

describe('toLocalParts / fromLocalParts', () => {
  it('туда и обратно', () => {
    const d = local(2026, 3, 5, 9, 5)
    expect(toLocalParts(d)).toEqual({ date: '2026-03-05', time: '09:05' })
    expect(fromLocalParts('2026-03-05', '09:05')).toEqual(d)
  })
  it('пустые и кривые значения дают null', () => {
    expect(fromLocalParts('', '09:05')).toBeNull()
    expect(fromLocalParts('2026-03-05', '')).toBeNull()
    expect(fromLocalParts('05.03.2026', '09:05')).toBeNull()
  })
})

describe('defaultStart', () => {
  const now = local(2026, 10, 20, 10, 0)
  it('мгновенная бронь: через 15 минут', () => {
    expect(defaultStart('instant', now)).toEqual(local(2026, 10, 20, 10, 15))
  })
  it('заявка: через 6 часов с запасом 30 минут', () => {
    expect(defaultStart('request_to_book', now)).toEqual(local(2026, 10, 20, 16, 30))
  })
})

describe('validateRange', () => {
  const now = local(2026, 10, 20, 10, 0)
  const ok = (mode: 'instant' | 'request_to_book', start: Date, end: Date) => validateRange({ start, end, mode, now })

  it('корректный диапазон', () => {
    expect(ok('instant', local(2026, 10, 20, 11, 0), local(2026, 10, 20, 13, 0))).toBeNull()
  })
  it('нет даты или времени', () => {
    expect(validateRange({ start: null, end: null, mode: 'instant', now })).toMatch(/Укажите/)
  })
  it('конец не позже начала', () => {
    expect(ok('instant', local(2026, 10, 20, 11, 0), local(2026, 10, 20, 11, 0))).toMatch(/позже/)
  })
  it('начало в прошлом', () => {
    expect(ok('instant', local(2026, 10, 20, 9, 0), local(2026, 10, 20, 12, 0))).toMatch(/в прошлом/)
  })
  it('заявка ближе 6 часов', () => {
    expect(ok('request_to_book', local(2026, 10, 20, 15, 0), local(2026, 10, 20, 18, 0))).toMatch(/6 часов/)
  })
  it('заявка ровно через 6 часов допустима', () => {
    expect(ok('request_to_book', local(2026, 10, 20, 16, 0), local(2026, 10, 20, 18, 0))).toBeNull()
  })
})

describe('formatDuration', () => {
  it('склеивает единицы', () => {
    expect(formatDuration(150)).toBe('2 ч 30 мин')
    expect(formatDuration(45)).toBe('45 мин')
    expect(formatDuration(120)).toBe('2 ч')
    expect(formatDuration(1440 + 120)).toBe('1 сут 2 ч')
    expect(formatDuration(0)).toBe('0 мин')
  })
})
