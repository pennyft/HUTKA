import { describe, expect, it } from 'vitest'
import { buildSettingsBody, isEmptyBody, parseDecimal, settingsProblems, toValues } from './logic'

const orig = { commissionPercent: 10, minRatingThreshold: 3.5, minRatingsCount: 3 }

describe('настройки', () => {
  it('значения формы из ответа сервера', () => {
    expect(toValues(orig)).toEqual({ commissionPercent: '10', minRatingThreshold: '3,5', minRatingsCount: '3' })
  })
  it('разбор числа: запятая и точка, до двух знаков', () => {
    expect(parseDecimal('12,5')).toBe(12.5)
    expect(parseDecimal(' 7.25 ')).toBe(7.25)
    expect(parseDecimal('1,234')).toBeNaN()
    expect(parseDecimal('')).toBeNaN()
    expect(parseDecimal('-1')).toBeNaN()
  })
  it('границы: комиссия 0–100, порог 1–5, минимум оценок целое не меньше 1', () => {
    expect(settingsProblems(toValues(orig))).toEqual({})
    expect(settingsProblems({ commissionPercent: '101', minRatingThreshold: '3', minRatingsCount: '3' }).commissionPercent).toBeDefined()
    expect(settingsProblems({ commissionPercent: '0', minRatingThreshold: '3', minRatingsCount: '3' })).toEqual({})
    expect(settingsProblems({ commissionPercent: '10', minRatingThreshold: '0,9', minRatingsCount: '3' }).minRatingThreshold).toBeDefined()
    expect(settingsProblems({ commissionPercent: '10', minRatingThreshold: '5,01', minRatingsCount: '3' }).minRatingThreshold).toBeDefined()
    expect(settingsProblems({ commissionPercent: '10', minRatingThreshold: '5', minRatingsCount: '0' }).minRatingsCount).toBeDefined()
    expect(settingsProblems({ commissionPercent: '10', minRatingThreshold: '5', minRatingsCount: '2,5' }).minRatingsCount).toBeDefined()
  })
  it('в запрос уходит только изменённое, пустой запрос распознаётся', () => {
    expect(isEmptyBody(buildSettingsBody(orig, toValues(orig)))).toBe(true)
    expect(buildSettingsBody(orig, { commissionPercent: '12,5', minRatingThreshold: '3,5', minRatingsCount: '3' })).toEqual({ commissionPercent: 12.5 })
    expect(buildSettingsBody(orig, { commissionPercent: '10', minRatingThreshold: '4', minRatingsCount: '5' })).toEqual({ minRatingThreshold: 4, minRatingsCount: 5 })
  })
})
