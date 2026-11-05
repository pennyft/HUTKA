import { describe, expect, it } from 'vitest'
import { exportFileName, parsePeriod, percentLabel, periodProblem, periodToParams, periodToQuery, presetPeriod } from './logic'

describe('период', () => {
  it('из адреса и обратно, мусор отбрасывается', () => {
    const p = parsePeriod(new URLSearchParams('from=2026-10-01&to=2026-10-25'))
    expect(p).toEqual({ from: '2026-10-01', to: '2026-10-25' })
    expect(periodToParams(p)).toEqual({ from: '2026-10-01', to: '2026-10-25' })
    expect(parsePeriod(new URLSearchParams('from=вчера&to=25.10'))).toEqual({ from: '', to: '' })
    expect(periodToParams({ from: '', to: '' })).toEqual({})
  })
  it('запрос: последний выбранный день входит целиком (граница исключающая)', () => {
    const q = periodToQuery({ from: '2026-10-01', to: '2026-10-25' })
    expect(new Date(q.from!).getTime()).toBe(new Date(2026, 9, 1).getTime())
    expect(new Date(q.to!).getTime()).toBe(new Date(2026, 9, 26).getTime())
    expect(periodToQuery({ from: '', to: '' })).toEqual({})
  })
  it('конец раньше начала недопустим, один день допустим', () => {
    expect(periodProblem({ from: '2026-10-10', to: '2026-10-01' })).toMatch(/раньше/)
    expect(periodProblem({ from: '2026-10-10', to: '2026-10-10' })).toBeNull()
    expect(periodProblem({ from: '', to: '2026-10-10' })).toBeNull()
  })
  it('быстрые периоды', () => {
    const now = new Date(2026, 9, 25)
    expect(presetPeriod('month', now)).toEqual({ from: '2026-10-01', to: '2026-10-25' })
    expect(presetPeriod('prevMonth', now)).toEqual({ from: '2026-09-01', to: '2026-09-30' })
    expect(presetPeriod('days30', now)).toEqual({ from: '2026-09-26', to: '2026-10-25' })
    expect(presetPeriod('prevMonth', new Date(2026, 0, 15))).toEqual({ from: '2025-12-01', to: '2025-12-31' })
  })
  it('имя файла выгрузки', () => {
    expect(exportFileName('payouts', { from: '2026-10-01', to: '2026-10-25' }, new Date())).toBe('hutka-payouts-2026-10-01_2026-10-25.csv')
    expect(exportFileName('commissions', { from: '', to: '' }, new Date(2026, 9, 25))).toBe('hutka-commissions-2026-10-01_2026-10-25.csv')
  })
  it('проценты', () => {
    expect(percentLabel(10)).toBe('10 %')
    expect(percentLabel(7.5)).toBe('7,5 %')
  })
})
