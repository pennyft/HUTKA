import { describe, expect, it } from 'vitest'
import type { Booking } from '@/features/bookings/types'
import { barFractions, hoursText, monthKey, monthLabel, monthTitle, percentText, shiftMonth, weekdayShort, weekLabel } from './analyticsLogic'
import { awaitingResponse, filtersToQuery, leftText, reasonProblem, responseMsLeft, sortPartnerBookings } from './bookingsLogic'
import { carBadges, visibilityState } from './carsLogic'
import { buildUpdateBody, isEmptyUpdate } from './editLogic'
import { cardDigits, cardProblem, formatCardInput, holderProblem, periodText } from './payoutsLogic'
import type { PartnerCar } from './types'

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: 'b',
  renterId: 'u',
  carId: 'c',
  status: 'pending',
  plannedStartAt: '2026-10-22T10:00:00Z',
  plannedEndAt: '2026-10-22T14:00:00Z',
  actualStartAt: null,
  actualEndAt: null,
  photosBefore: [],
  photosAfter: [],
  pricePerHour: 10,
  priceEstimate: 40,
  finalPrice: null,
  pddDiscountApplied: false,
  discountAmount: null,
  overdueHours: null,
  confirmedAt: null,
  declineReason: null,
  createdAt: '2026-10-20T09:00:00Z',
  ...over,
})

const car = (over: Partial<PartnerCar> = {}): PartnerCar => ({
  id: 'c1',
  make: 'Skoda',
  model: 'Octavia',
  year: 2020,
  plateNumber: '1234 AB-7',
  mileageKm: 80000,
  address: 'Минск, пр. Независимости, 1',
  pricePerHour: 12.5,
  photos: ['a', 'b', 'c', 'd', 'e'],
  inspectionExpiryDate: '2027-01-01',
  bookingMode: 'instant',
  moderationStatus: 'approved',
  rejectionReason: null,
  status: 'available',
  hidden: false,
  hiddenByStrikes: false,
  hiddenByAdmin: false,
  noShowStrikes: 0,
  ratingAvg: null,
  monthIncome: null,
  description: null,
  availabilitySchedule: null,
  serviceHistory: null,
  ...over,
})

describe('заявки', () => {
  it('заявка ждёт ответа: pending без confirmedAt', () => {
    expect(awaitingResponse(booking())).toBe(true)
    expect(awaitingResponse(booking({ confirmedAt: '2026-10-20T10:00:00Z' }))).toBe(false)
    expect(awaitingResponse(booking({ status: 'cancelled' }))).toBe(false)
  })
  it('на ответ 6 часов от создания', () => {
    const b = booking({ createdAt: '2026-10-20T09:00:00Z' })
    expect(responseMsLeft(b, new Date('2026-10-20T11:00:00Z'))).toBe(4 * 3600_000)
    expect(responseMsLeft(b, new Date('2026-10-20T16:00:00Z'))).toBeLessThan(0)
  })
  it('сколько осталось', () => {
    expect(leftText(0)).toBe('срок истёк')
    expect(leftText(30_000)).toBe('менее минуты')
    expect(leftText(45 * 60_000)).toBe('45 мин')
    expect(leftText((3 * 60 + 12) * 60_000)).toBe('3 ч 12 мин')
  })
  it('причина отказа обязательна, до 255', () => {
    expect(reasonProblem('  ')).toBe('Укажите причину отказа')
    expect(reasonProblem('a'.repeat(255))).toBeNull()
    expect(reasonProblem('a'.repeat(256))).toMatch(/255/)
  })
  it('сначала заявки, ждущие ответа (самые старые), потом остальные по началу', () => {
    const w1 = booking({ id: 'w1', createdAt: '2026-10-20T08:00:00Z' })
    const w2 = booking({ id: 'w2', createdAt: '2026-10-20T07:00:00Z' })
    const c = booking({ id: 'c', confirmedAt: 'x', plannedStartAt: '2026-10-21T10:00:00Z' })
    const d = booking({ id: 'd', confirmedAt: 'x', plannedStartAt: '2026-10-20T10:00:00Z' })
    expect(sortPartnerBookings([c, w1, d, w2]).map((b) => b.id)).toEqual(['w2', 'w1', 'd', 'c'])
  })
  it('фильтры формы в запрос: даты включают весь последний день', () => {
    expect(filtersToQuery({ status: '', carId: '', from: '', to: '' })).toEqual({})
    const q = filtersToQuery({ status: 'pending', carId: 'c1', from: '2026-10-20', to: '2026-10-22' })
    expect(q.status).toBe('pending')
    expect(q.carId).toBe('c1')
    expect(new Date(q.from!).getTime()).toBe(new Date(2026, 9, 20).getTime())
    expect(new Date(q.to!).getTime()).toBe(new Date(2026, 9, 23).getTime())
  })
})

describe('машины', () => {
  it('метки состояния', () => {
    expect(carBadges(car({ moderationStatus: 'pending' })).map((b) => b.label)).toEqual(['На модерации'])
    expect(carBadges(car({ hidden: true, hiddenByStrikes: true, noShowStrikes: 3 })).map((b) => b.label)).toEqual(['Скрыта из-за неявок (3)'])
    expect(carBadges(car({ hidden: true })).map((b) => b.label)).toEqual(['Скрыта вами'])
    expect(carBadges(car({ hidden: true, hiddenByAdmin: true })).map((b) => b.label)).toEqual(['Скрыта администратором'])
  })
  it('скрыть и показать', () => {
    expect(visibilityState(car())).toEqual({ kind: 'toggle', hide: true })
    expect(visibilityState(car({ hidden: true }))).toEqual({ kind: 'toggle', hide: false })
    expect(visibilityState(car({ hidden: true, hiddenByAdmin: true })).kind).toBe('locked')
    expect(visibilityState(car({ hidden: true, hiddenByStrikes: true })).kind).toBe('locked')
    expect(visibilityState(car({ moderationStatus: 'pending' })).kind).toBe('unavailable')
  })
})

describe('правка машины: в запрос только изменённое', () => {
  const same = { pricePerHour: 12.5, address: 'Минск, пр. Независимости, 1', bookingMode: 'instant' as const, description: '' }
  it('ничего не менялось: пусто', () => {
    expect(isEmptyUpdate(buildUpdateBody(car(), same, car().photos, null))).toBe(true)
  })
  it('изменённые поля', () => {
    const b = buildUpdateBody(car(), { ...same, pricePerHour: 15, address: ' Минск, ул. Мира, 5 ', bookingMode: 'request_to_book' }, car().photos, null)
    expect(b).toEqual({ pricePerHour: 15, address: 'Минск, ул. Мира, 5', bookingMode: 'request_to_book' })
  })
  it('фото: передаются целым списком, если изменился состав или порядок', () => {
    expect(buildUpdateBody(car(), same, ['a', 'b', 'c', 'd', 'e', 'f'], null).photos).toHaveLength(6)
    expect(buildUpdateBody(car(), same, ['b', 'a', 'c', 'd', 'e'], null).photos).toBeDefined()
    expect('photos' in buildUpdateBody(car(), same, car().photos, null)).toBe(false)
  })
  it('описание: отправляется только новое и непустое', () => {
    const withDesc = car({ description: 'Чистая машина' })
    expect(buildUpdateBody(withDesc, { ...same, description: 'Чистая машина' }, withDesc.photos, null)).toEqual({})
    expect(buildUpdateBody(withDesc, { ...same, description: ' Новое ' }, withDesc.photos, null)).toEqual({ description: 'Новое' })
    expect(buildUpdateBody(withDesc, { ...same, description: '   ' }, withDesc.photos, null)).toEqual({})
  })
  it('расписание: отправляется только изменённое', () => {
    const current = '{"mon":[{"from":"08:00","to":"22:00"}],"tue":[]}'
    const withSched = car({ availabilitySchedule: current })
    const reordered = '{ "tue": [], "mon": [ { "to": "22:00", "from": "08:00" } ] }'
    expect(buildUpdateBody(withSched, same, withSched.photos, reordered)).toEqual({})
    expect(buildUpdateBody(withSched, same, withSched.photos, '{"mon":[{"from":"09:00","to":"22:00"}]}').availabilitySchedule).toBeDefined()
    expect(buildUpdateBody(car(), same, car().photos, '{"mon":[]}').availabilitySchedule).toBe('{"mon":[]}')
  })
})

describe('аналитика', () => {
  it('столбцы в долях от максимума', () => {
    expect(barFractions([0, 5, 10])).toEqual([0, 0.5, 1])
    expect(barFractions([0, 0])).toEqual([0, 0])
    expect(barFractions([])).toEqual([])
  })
  it('подписи', () => {
    expect(weekdayShort(1)).toBe('Пн')
    expect(weekdayShort(7)).toBe('Вс')
    expect(weekdayShort(9)).toBe('')
    expect(weekLabel('2026-10-12')).toBe('12.10')
    expect(monthLabel('2026-10-01')).toBe('окт')
    expect(percentText(72.6)).toBe('73 %')
    expect(percentText(null)).toBe('нет данных')
    expect(hoursText(null)).toBe('—')
    expect(hoursText(0.5)).toBe('30 мин')
    expect(hoursText(4.5)).toBe('4,5 ч')
  })
  it('месяцы', () => {
    expect(monthKey(new Date(2026, 9, 25))).toBe('2026-10')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(monthTitle('2026-10')).toBe('Октябрь 2026 г.')
  })
})

describe('реквизиты и выплаты', () => {
  it('номер карты: 16–19 цифр, пробелы и дефисы допустимы', () => {
    expect(cardDigits('4111 1111-1111 1111')).toBe('4111111111111111')
    expect(cardProblem('4111 1111 1111 1111')).toBeNull()
    expect(cardProblem('4111-1111-1111-1111-123')).toBeNull()
    expect(cardProblem('4111 1111')).toMatch(/16/)
    expect(cardProblem('4111 1111 1111 111a')).toMatch(/16/)
    expect(cardProblem('1'.repeat(20))).toMatch(/19/)
  })
  it('ввод номера группируется по четыре цифры и обрезается до 19', () => {
    expect(formatCardInput('4111111111111111')).toBe('4111 1111 1111 1111')
    expect(formatCardInput('4111-1111 abc 11')).toBe('4111 1111 11')
    expect(formatCardInput('1'.repeat(25)).replace(/ /g, '')).toHaveLength(19)
  })
  it('имя держателя', () => {
    expect(holderProblem('IVAN PETROV')).toBeNull()
    expect(holderProblem("Анна-Мария О'Нил")).toBeNull()
    expect(holderProblem('A')).toMatch(/2/)
    expect(holderProblem('1van')).toMatch(/буквы/)
    expect(holderProblem('a'.repeat(101))).toMatch(/100/)
  })
  it('период выплаты', () => {
    expect(periodText('2026-10-06', '2026-10-12')).toBe('06.10 – 12.10.2026')
    expect(periodText('x', 'y')).toBe('x – y')
  })
})
