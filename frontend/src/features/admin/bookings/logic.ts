import type { BookingStatus } from '@/features/bookings/types'
import type { BookingsQuery } from './api'
import type { AdminBookingDetail, BookingFilters, PaymentStatus } from './types'

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Ожидает',
  active: 'Идёт',
  finished: 'Завершена',
  cancelled: 'Отменена',
}
export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = { pending: 'Ожидает списания', succeeded: 'Списан', failed: 'Не удалось списать' }

export const isUuid = (s: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
const isDay = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s)

/** Фильтры из адреса. Идентификаторы принимаем только в виде UUID: иначе бэк ответит 400 на мусор из ссылки. Страница с 1. */
export function parseBookingFilters(sp: URLSearchParams): BookingFilters {
  const st = sp.get('status')
  const id = (k: string) => (isUuid(sp.get(k) ?? '') ? (sp.get(k) as string) : '')
  const day = (k: string) => (isDay(sp.get(k) ?? '') ? (sp.get(k) as string) : '')
  const page = Number(sp.get('page'))
  return {
    status: st === 'pending' || st === 'active' || st === 'finished' || st === 'cancelled' ? st : '',
    carId: id('carId'),
    renterId: id('renterId'),
    userId: id('userId'),
    from: day('from'),
    to: day('to'),
    page: Number.isInteger(page) && page >= 1 ? page - 1 : 0,
  }
}

export function bookingFiltersToParams(f: BookingFilters): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of ['status', 'carId', 'renterId', 'userId', 'from', 'to'] as const) if (f[k]) out[k] = f[k]
  if (f.page > 0) out.page = String(f.page + 1)
  return out
}

const parseDay = (v: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

/** Запрос к API: даты это календарные дни устройства, от начала первого до начала дня после последнего (включая последний день). */
export function bookingFiltersToQuery(f: BookingFilters): BookingsQuery {
  const q: BookingsQuery = { page: f.page }
  if (f.status) q.status = f.status
  if (f.carId) q.carId = f.carId
  if (f.renterId) q.renterId = f.renterId
  if (f.userId) q.userId = f.userId
  const from = parseDay(f.from)
  if (from) q.from = from.toISOString()
  const to = parseDay(f.to)
  if (to) q.to = new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1).toISOString()
  return q
}

export const TIMELINE_LABEL: Record<string, string> = {
  created: 'Бронь создана',
  confirmed: 'Подтверждена партнёром',
  trip_started: 'Поездка началась',
  overdue_escalated: 'Просрочка передана в спор',
  trip_finished: 'Поездка завершена',
  agreement_sent: 'Договор отправлен арендатору',
  payment_created: 'Платёж создан',
  dispute_opened: 'Спор открыт',
  dispute_resolved: 'Спор решён',
}
export const timelineLabel = (event: string): string => TIMELINE_LABEL[event] ?? event

export type ForceCloseState = { kind: 'available' } | { kind: 'blocked'; reason: string }

/** «Принудительно закрыть» (AD9): только идущая поездка, переданная в спор, у которого уже есть решение. Иначе сервер ответит 409. */
export function forceCloseState(b: Pick<AdminBookingDetail, 'status' | 'escalatedAt' | 'dispute'>): ForceCloseState {
  if (b.status !== 'active') return { kind: 'blocked', reason: 'Принудительно закрыть можно только идущую поездку.' }
  if (!b.escalatedAt) return { kind: 'blocked', reason: 'Бронь не передавалась в спор: закрывать её принудительно рано.' }
  if (b.dispute?.status !== 'resolved') return { kind: 'blocked', reason: 'Сначала решите спор по этой брони.' }
  return { kind: 'available' }
}

/** Короткий номер для таблицы: первые 8 символов идентификатора. */
export const shortId = (id: string): string => id.slice(0, 8)
