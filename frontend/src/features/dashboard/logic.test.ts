import { describe, expect, it } from 'vitest'
import type { Booking } from '@/features/bookings/types'
import { clockRange, dateLine, dayInZone, dayWeatherLine, distinctBookings, fmtTemp, forecastFor, formatLeft, greeting, pickHero } from './logic'
import type { DayForecast } from './types'

const at = (h: number) => new Date(2026, 9, 20, h, 0)

describe('greeting', () => {
  it('по времени суток', () => {
    expect(greeting(at(7))).toBe('Доброе утро')
    expect(greeting(at(13))).toBe('Добрый день')
    expect(greeting(at(20))).toBe('Добрый вечер')
    expect(greeting(at(2))).toBe('Доброй ночи')
    expect(greeting(at(23))).toBe('Доброй ночи')
    expect(greeting(at(5))).toBe('Доброе утро')
  })
  it('строка даты', () => {
    expect(dateLine(new Date(2026, 9, 20, 12))).toBe('вторник, 20 октября')
  })
})

describe('dayInZone', () => {
  it('минская дата, а не UTC', () => {
    expect(dayInZone('2026-10-20T21:30:00Z')).toBe('2026-10-21')
    expect(dayInZone('2026-10-20T20:30:00Z')).toBe('2026-10-20')
  })
})

describe('fmtTemp', () => {
  it('минус, ноль и округление', () => {
    expect(fmtTemp(12.4)).toBe('12°')
    expect(fmtTemp(-2.6)).toBe('−3°')
    expect(fmtTemp(-0.2)).toBe('0°')
  })
})

describe('formatLeft', () => {
  it('дни, часы, минуты', () => {
    expect(formatLeft((24 + 14) * 3_600_000)).toBe('1 д 14 ч')
    expect(formatLeft(2 * 86_400_000)).toBe('2 д')
    expect(formatLeft(5 * 3_600_000 + 20 * 60_000)).toBe('5 ч 20 мин')
    expect(formatLeft(3 * 3_600_000)).toBe('3 ч')
    expect(formatLeft(12 * 60_000)).toBe('12 мин')
    expect(formatLeft(10)).toBe('1 мин')
  })
})

const booking = (over: Partial<Booking>): Booking =>
  ({
    id: 'b',
    status: 'pending',
    plannedStartAt: '2026-10-22T10:00:00Z',
    plannedEndAt: '2026-10-22T14:00:00Z',
    createdAt: '2026-10-20T06:00:00Z',
    confirmedAt: null,
    photosBefore: [],
    photosAfter: [],
    ...over,
  }) as Booking

describe('pickHero', () => {
  it('идущая поездка важнее ближайших', () => {
    const a = booking({ id: 'a', status: 'active', plannedEndAt: '2026-10-20T18:00:00Z' })
    const p = booking({ id: 'p' })
    const r = pickHero([p, a])
    expect(r.hero).toEqual({ kind: 'active', booking: a })
    expect(r.upcoming.map((b) => b.id)).toEqual(['p'])
  })
  it('без идущей берётся ближайшая, и в списке её нет', () => {
    const later = booking({ id: 'later', plannedStartAt: '2026-10-25T09:00:00Z' })
    const soon = booking({ id: 'soon', plannedStartAt: '2026-10-22T10:00:00Z' })
    const r = pickHero([later, soon, booking({ id: 'done', status: 'finished' })])
    expect(r.hero).toEqual({ kind: 'upcoming', booking: soon })
    expect(r.upcoming.map((b) => b.id)).toEqual(['later'])
  })
  it('нет броней', () => {
    expect(pickHero([booking({ status: 'finished' }), booking({ status: 'cancelled' })])).toEqual({ hero: null, upcoming: [] })
  })
})

const day = (over: Partial<DayForecast>): DayForecast => ({
  date: '2026-10-22',
  weatherCode: 3,
  temperatureMinC: 4,
  temperatureMaxC: 11,
  precipitationSumMm: 0,
  windGustMaxKmh: 20,
  hazards: [],
  ...over,
})

describe('погода для поездки', () => {
  it('день находится по минской дате', () => {
    expect(forecastFor([day({ date: '2026-10-22' })], '2026-10-22T10:00:00Z')?.date).toBe('2026-10-22')
    expect(forecastFor([day({ date: '2026-10-22' })], '2026-10-30T10:00:00Z')).toBeUndefined()
  })
  it('строка: без осадков, с явлениями, без данных', () => {
    expect(dayWeatherLine(day({}))).toBe('11° / 4° · без осадков')
    expect(dayWeatherLine(day({ hazards: ['rain', 'strong_wind'], precipitationSumMm: 5 }))).toBe('11° / 4° · ожидается дождь, сильный ветер')
    expect(dayWeatherLine(day({ precipitationSumMm: 2 }))).toBe('11° / 4°')
    expect(dayWeatherLine(day({ temperatureMaxC: null, temperatureMinC: null, precipitationSumMm: null }))).toBe('')
  })
})

describe('clockRange и distinctBookings', () => {
  it('в пределах суток только время', () => {
    expect(clockRange('2026-10-22T10:00:00', '2026-10-22T14:00:00')).toBe('10:00–14:00')
  })
  it('через сутки с датой', () => {
    expect(clockRange('2026-10-22T10:00:00', '2026-10-23T14:00:00')).toBe('10:00 – 23 окт, 14:00')
  })
  it('поездки без повторов', () => {
    expect(distinctBookings([{ bookingId: 'a' }, { bookingId: 'a' }, { bookingId: 'b' }])).toEqual(['a', 'b'])
  })
})
