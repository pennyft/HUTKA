import type { TripDetail } from './types'

/** Часовой пояс групповых поездок (app.group-trips.timezone): «сегодня» и день поездки считаются в нём. */
export const TRIP_ZONE = 'Europe/Minsk'

/** Сегодняшняя дата YYYY-MM-DD в минском поясе. */
export function todayInMinsk(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TRIP_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export const ROUTE_MAX = 300
export const MESSAGE_MAX = 1000
export const MIN_PARTICIPANTS = 2
export const MAX_PARTICIPANTS = 50

export interface TripActions {
  canJoin: boolean
  canClose: boolean
  canCancel: boolean
  /** Можно ли писать в чат (читать историю можно всегда, но только участникам) */
  chatWritable: boolean
}

type ActionInput = Pick<TripDetail, 'status' | 'date' | 'joined' | 'full' | 'organizerId'>

/**
 * Какие действия показывать. Зеркало GroupTripRules бэка (joinDenial, closeDenial, cancelDenial, chatWritable):
 * бэк всё равно проверит сам и вернёт 409 с текстом, это только чтобы не показывать заведомо недоступные кнопки.
 * today передаётся снаружи (минская дата), поэтому функция детерминирована.
 */
export function tripActions(trip: ActionInput, meId: string | undefined, today: string): TripActions {
  const isOrganizer = !!meId && trip.organizerId === meId
  const live = trip.status === 'open' || trip.status === 'closed'
  const notPast = today <= trip.date
  return {
    canJoin: trip.status === 'open' && notPast && !trip.joined && !trip.full,
    canClose: isOrganizer && trip.status === 'open' && notPast,
    canCancel: isOrganizer && live && today < trip.date,
    chatWritable: trip.joined && live && notPast,
  }
}
