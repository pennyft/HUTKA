import { describe, expect, it } from 'vitest'
import { formatAgo } from './time'

const now = new Date('2026-10-20T12:00:00Z')

describe('formatAgo', () => {
  it('до минуты', () => expect(formatAgo('2026-10-20T11:59:30Z', now)).toBe('только что'))
  it('минуты', () => expect(formatAgo('2026-10-20T11:55:00Z', now)).toBe('5 мин назад'))
  it('часы', () => expect(formatAgo('2026-10-20T09:00:00Z', now)).toBe('3 ч назад'))
  it('старше суток: дата', () => expect(formatAgo('2026-10-12T14:05:00Z', now, 'UTC')).toBe('12 окт, 14:05'))
  it('мусор', () => expect(formatAgo('x', now)).toBe(''))
})
