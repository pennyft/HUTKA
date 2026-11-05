import { PARTNER_RESPONSE_MS } from '@/features/bookings/status'
import type { PartnerBookingsQuery } from './api'
import type { Booking, BookingStatus } from '@/features/bookings/types'

/** Заявка ждёт ответа партнёра: pending и confirmedAt пуст (так различаются «Ждёт партнёра» и «Подтверждена»). */
export const awaitingResponse = (b: Pick<Booking, 'status' | 'confirmedAt'>): boolean => b.status === 'pending' && !b.confirmedAt

/** Сколько осталось на ответ: 6 часов от создания заявки. Отрицательное значение: срок вышел, бэк вот-вот отклонит заявку сам. */
export function responseMsLeft(b: Pick<Booking, 'createdAt'>, now: Date): number {
  return new Date(b.createdAt).getTime() + PARTNER_RESPONSE_MS - now.getTime()
}

/** «3 ч 12 мин», «45 мин», «менее минуты». */
export function leftText(ms: number): string {
  if (ms <= 0) return 'срок истёк'
  const total = Math.floor(ms / 60_000)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h > 0) return `${h} ч ${m} мин`
  return m > 0 ? `${m} мин` : 'менее минуты'
}

export const DECLINE_REASON_MAX = 255

/** Причина отказа обязательна (DeclineBookingRequest: @NotBlank, до 255). */
export function reasonProblem(reason: string): string | null {
  const r = reason.trim()
  if (r.length === 0) return 'Укажите причину отказа'
  if (r.length > DECLINE_REASON_MAX) return `Не больше ${DECLINE_REASON_MAX} символов`
  return null
}

export interface BookingFilters {
  status: '' | BookingStatus
  carId: string
  /** YYYY-MM-DD из полей даты. */
  from: string
  to: string
}

/** Фильтры формы в параметры запроса. Даты это календарные дни устройства: с начала первого до конца последнего дня включительно. */
export function filtersToQuery(f: BookingFilters): PartnerBookingsQuery {
  const q: PartnerBookingsQuery = {}
  if (f.status) q.status = f.status
  if (f.carId) q.carId = f.carId
  const start = parseDay(f.from)
  if (start) q.from = start.toISOString()
  const end = parseDay(f.to)
  if (end) q.to = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).toISOString()
  return q
}

function parseDay(v: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

/** Заявки, на которые нужно ответить, сверху (самые срочные первыми), остальные по времени начала (ближайшие сверху). */
export function sortPartnerBookings<T extends Booking>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const wa = awaitingResponse(a)
    const wb = awaitingResponse(b)
    if (wa !== wb) return wa ? -1 : 1
    if (wa && wb) return a.createdAt.localeCompare(b.createdAt)
    return a.plannedStartAt.localeCompare(b.plannedStartAt)
  })
}
