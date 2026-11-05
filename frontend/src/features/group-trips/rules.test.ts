import { describe, expect, it } from 'vitest'
import { todayInMinsk, tripActions } from './rules'

const trip = (over: Partial<Parameters<typeof tripActions>[0]> = {}) => ({
  status: 'open' as const,
  date: '2026-10-25',
  joined: false,
  full: false,
  organizerId: 'org',
  ...over,
})

describe('todayInMinsk', () => {
  it('минская дата, а не UTC', () => {
    expect(todayInMinsk(new Date('2026-10-20T21:30:00Z'))).toBe('2026-10-21')
  })
})

describe('tripActions', () => {
  it('гость поездки: можно присоединиться, чат закрыт', () => {
    expect(tripActions(trip(), 'me', '2026-10-20')).toEqual({ canJoin: true, canClose: false, canCancel: false, chatWritable: false })
  })
  it('нельзя присоединиться: уже участвует, мест нет, набор закрыт, поездка прошла', () => {
    expect(tripActions(trip({ joined: true }), 'me', '2026-10-20').canJoin).toBe(false)
    expect(tripActions(trip({ full: true }), 'me', '2026-10-20').canJoin).toBe(false)
    expect(tripActions(trip({ status: 'closed' }), 'me', '2026-10-20').canJoin).toBe(false)
    expect(tripActions(trip(), 'me', '2026-10-26').canJoin).toBe(false)
  })
  it('организатор: закрыть набор и отменить', () => {
    expect(tripActions(trip({ joined: true }), 'org', '2026-10-20')).toEqual({ canJoin: false, canClose: true, canCancel: true, chatWritable: true })
  })
  it('в день поездки отменить нельзя, закрыть набор можно', () => {
    const a = tripActions(trip({ joined: true }), 'org', '2026-10-25')
    expect(a.canCancel).toBe(false)
    expect(a.canClose).toBe(true)
    expect(a.chatWritable).toBe(true)
  })
  it('закрытый набор: закрывать нечего, отменить и писать можно', () => {
    const a = tripActions(trip({ status: 'closed', joined: true }), 'org', '2026-10-20')
    expect(a.canClose).toBe(false)
    expect(a.canCancel).toBe(true)
    expect(a.chatWritable).toBe(true)
  })
  it('отменена или завершена: ничего нельзя', () => {
    for (const status of ['cancelled', 'finished'] as const) {
      expect(tripActions(trip({ status, joined: true }), 'org', '2026-10-20')).toEqual({ canJoin: false, canClose: false, canCancel: false, chatWritable: false })
    }
  })
  it('после даты поездки чат только для чтения', () => {
    expect(tripActions(trip({ joined: true }), 'me', '2026-10-26').chatWritable).toBe(false)
  })
})
