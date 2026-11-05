import { describe, expect, it } from 'vitest'
import { bookingPhase, bookingStatusLabel, canStartNow, countByTab, defaultTab, noShowDeadline, overdueMs, partnerDeadline, sortForTab } from './status'
import type { Booking } from './types'

const base = {
  id: 'x',
  renterId: 'r',
  carId: 'c',
  plannedStartAt: '2026-10-20T10:00:00Z',
  plannedEndAt: '2026-10-20T12:00:00Z',
  actualStartAt: null,
  actualEndAt: null,
  photosBefore: [],
  photosAfter: [],
  pricePerHour: 5,
  priceEstimate: 10,
  finalPrice: null,
  pddDiscountApplied: false,
  discountAmount: null,
  overdueHours: null,
  confirmedAt: null,
  declineReason: null,
  createdAt: '2026-10-20T06:00:00Z',
} as const
const b = (over: Partial<Booking>): Booking => ({ ...base, status: 'pending', photosBefore: [], photosAfter: [], ...over }) as Booking

describe('bookingPhase и подписи', () => {
  it('pending без confirmedAt ждёт партнёра', () => {
    expect(bookingPhase(b({}))).toBe('awaiting_partner')
    expect(bookingStatusLabel(b({}))).toBe('Ждёт партнёра')
  })
  it('pending с confirmedAt подтверждена', () => {
    const x = b({ confirmedAt: '2026-10-20T06:01:00Z' })
    expect(bookingPhase(x)).toBe('confirmed')
    expect(bookingStatusLabel(x)).toBe('Подтверждена')
  })
  it('остальные статусы как в API', () => {
    expect(bookingStatusLabel(b({ status: 'active' }))).toBe('Идёт поездка')
    expect(bookingStatusLabel(b({ status: 'finished' }))).toBe('Завершена')
    expect(bookingStatusLabel(b({ status: 'cancelled' }))).toBe('Отменена')
  })
})

describe('сроки', () => {
  it('ответ партнёра: 6 часов с создания', () => {
    expect(partnerDeadline(b({})).toISOString()).toBe('2026-10-20T12:00:00.000Z')
  })
  it('не начали поездку: час после планового старта', () => {
    expect(noShowDeadline(b({})).toISOString()).toBe('2026-10-20T11:00:00.000Z')
  })
  it('просрочка только у активной поездки', () => {
    const active = b({ status: 'active' })
    expect(overdueMs(active, new Date('2026-10-20T11:00:00Z'))).toBe(0)
    expect(overdueMs(active, new Date('2026-10-20T12:30:00Z'))).toBe(30 * 60_000)
    expect(overdueMs(b({ status: 'finished' }), new Date('2026-10-20T15:00:00Z'))).toBe(0)
  })
})

describe('canStartNow', () => {
  const confirmed = b({ confirmedAt: '2026-10-20T06:01:00Z' })
  it('до планового старта нельзя, после можно', () => {
    expect(canStartNow(confirmed, new Date('2026-10-20T09:59:00Z'))).toBe(false)
    expect(canStartNow(confirmed, new Date('2026-10-20T10:00:00Z'))).toBe(true)
  })
  it('неподтверждённую начать нельзя', () => {
    expect(canStartNow(b({}), new Date('2026-10-20T10:30:00Z'))).toBe(false)
  })
})

describe('вкладки', () => {
  it('считает и выбирает вкладку по умолчанию', () => {
    const counts = countByTab([b({}), b({ status: 'finished' }), b({ status: 'finished' })])
    expect(counts).toEqual({ pending: 1, active: 0, finished: 2, cancelled: 0 })
    expect(defaultTab(counts)).toBe('pending')
    expect(defaultTab({ pending: 1, active: 1, finished: 0, cancelled: 0 })).toBe('active')
    expect(defaultTab({ pending: 0, active: 0, finished: 0, cancelled: 0 })).toBe('pending')
  })
  it('ожидающие: ближайшие вперёд; завершённые: новые вперёд', () => {
    const a = b({ id: 'a', plannedStartAt: '2026-10-22T10:00:00Z' })
    const c = b({ id: 'c', plannedStartAt: '2026-10-21T10:00:00Z' })
    expect(sortForTab('pending', [a, c]).map((x) => x.id)).toEqual(['c', 'a'])
    const f1 = b({ id: 'f1', status: 'finished', actualEndAt: '2026-10-01T10:00:00Z' })
    const f2 = b({ id: 'f2', status: 'finished', actualEndAt: '2026-10-05T10:00:00Z' })
    expect(sortForTab('finished', [f1, f2]).map((x) => x.id)).toEqual(['f2', 'f1'])
  })
})
