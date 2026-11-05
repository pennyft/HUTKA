import { describe, expect, it } from 'vitest'
import { durationMinutes, estimateAmount } from './pricing'

const t = (iso: string) => new Date(iso)

describe('estimateAmount', () => {
  it('целые часы', () => {
    expect(estimateAmount(t('2026-10-20T10:00:00Z'), t('2026-10-20T12:00:00Z'), 7.5)).toBe(15)
  })
  it('полтора часа', () => {
    expect(estimateAmount(t('2026-10-20T10:00:00Z'), t('2026-10-20T11:30:00Z'), 7.5)).toBe(11.25)
  })
  it('20 минут по 1000 даёт 333.33, а не 333.30 (пример из комментария бэка)', () => {
    expect(estimateAmount(t('2026-10-20T10:00:00Z'), t('2026-10-20T10:20:00Z'), 1000)).toBe(333.33)
  })
  it('округляет половину копейки вверх (HALF_UP)', () => {
    // 0,01 BYN/ч за 30 минут = 0,005 → 0,01
    expect(estimateAmount(t('2026-10-20T10:00:00Z'), t('2026-10-20T10:30:00Z'), 0.01)).toBe(0.01)
  })
  it('пустой и отрицательный интервал дают 0', () => {
    expect(estimateAmount(t('2026-10-20T10:00:00Z'), t('2026-10-20T10:00:00Z'), 7.5)).toBe(0)
    expect(estimateAmount(t('2026-10-20T12:00:00Z'), t('2026-10-20T10:00:00Z'), 7.5)).toBe(0)
  })
  it('сутки', () => {
    expect(estimateAmount(t('2026-10-20T10:00:00Z'), t('2026-10-21T10:00:00Z'), 5)).toBe(120)
  })
})

describe('durationMinutes', () => {
  it('считает минуты', () => {
    expect(durationMinutes(t('2026-10-20T10:00:00Z'), t('2026-10-20T12:30:00Z'))).toBe(150)
  })
})
