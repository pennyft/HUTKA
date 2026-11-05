import { describe, expect, it } from 'vitest'
import { getAge, todayIso } from './date'

const now = new Date(2026, 9, 17) // 17 октября 2026

describe('getAge', () => {
  it('в день 18-летия уже 18', () => expect(getAge('2008-10-17', now)).toBe(18))
  it('за день до 18-летия ещё 17', () => expect(getAge('2008-10-18', now)).toBe(17))
  it('пустая или кривая дата даёт 0', () => {
    expect(getAge('', now)).toBe(0)
    expect(getAge('17.10.2008', now)).toBe(0)
  })
})

describe('todayIso', () => {
  it('форматирует YYYY-MM-DD', () => expect(todayIso(now)).toBe('2026-10-17'))
})
