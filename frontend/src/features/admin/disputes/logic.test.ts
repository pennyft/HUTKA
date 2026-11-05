import { describe, expect, it } from 'vitest'
import { buildResolveBody, disputeEventLabel, parseDamage, parseDisputeTab, resolveProblem } from './logic'

describe('сумма ущерба', () => {
  it('разбор: запятая и точка, до двух знаков', () => {
    expect(parseDamage('1500')).toBe(1500)
    expect(parseDamage('1500,5')).toBe(1500.5)
    expect(parseDamage(' 0.00 ')).toBe(0)
    expect(parseDamage('12,555')).toBeNaN()
    expect(parseDamage('-5')).toBeNaN()
    expect(parseDamage('abc')).toBeNaN()
  })
})

describe('правила решения как в DisputeRules', () => {
  it('решение обязательно', () => {
    expect(resolveProblem('', '')).toMatch(/в чью пользу/)
  })
  it('в пользу арендатора: сумма пустая или нулевая', () => {
    expect(resolveProblem('renter_favor', '')).toBeNull()
    expect(resolveProblem('renter_favor', '0,00')).toBeNull()
    expect(resolveProblem('renter_favor', '100')).toMatch(/пустой или нулевой/)
  })
  it('в пользу партнёра: сумма обязательна, 0,00 допустимо', () => {
    expect(resolveProblem('partner_favor', '')).toMatch(/Укажите/)
    expect(resolveProblem('partner_favor', '0,00')).toBeNull()
    expect(resolveProblem('partner_favor', '250,5')).toBeNull()
    expect(resolveProblem('partner_favor', '-1')).toMatch(/отрицательной/)
    expect(resolveProblem('partner_favor', '12,555')).toMatch(/два знака|двумя знаками/)
    expect(resolveProblem('partner_favor', '100000000')).toMatch(/велика/)
    expect(resolveProblem('partner_favor', '99999999,99')).toBeNull()
  })
  it('тело запроса', () => {
    expect(buildResolveBody('renter_favor', '')).toEqual({ decision: 'renter_favor' })
    expect(buildResolveBody('partner_favor', '1500,5')).toEqual({ decision: 'partner_favor', damageAmount: 1500.5 })
    expect(buildResolveBody('partner_favor', '0')).toEqual({ decision: 'partner_favor', damageAmount: 0 })
  })
})

describe('вкладки и события', () => {
  it('вкладка по умолчанию открытые', () => {
    expect(parseDisputeTab('resolved')).toBe('resolved')
    expect(parseDisputeTab('x')).toBe('open')
  })
  it('события спора', () => {
    expect(disputeEventLabel('dispute_opened')).toMatch(/3 часа/)
    expect(disputeEventLabel('что-то')).toBe('что-то')
  })
})
