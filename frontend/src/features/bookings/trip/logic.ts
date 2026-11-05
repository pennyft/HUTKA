import type { Booking } from '../types'
import { canStartNow, noShowDeadline } from '../status'

export const TRIP_PHOTOS_MIN = 1
export const TRIP_PHOTOS_MAX = 20

export type TripMode = 'start' | 'finish'

/** Подсказка под кнопкой «Начать поездку»: когда можно начать и до какого момента, иначе бронь отменится сама. */
export type StartHint = { kind: 'wait'; from: Date } | { kind: 'deadline'; until: Date } | { kind: 'expired' }

export function startHint(b: Pick<Booking, 'status' | 'confirmedAt' | 'plannedStartAt'>, now: Date): StartHint {
  const start = new Date(b.plannedStartAt)
  if (!canStartNow(b, now)) return { kind: 'wait', from: start }
  const until = noShowDeadline(b)
  return now.getTime() > until.getTime() ? { kind: 'expired' } : { kind: 'deadline', until }
}

/** Можно ли отправить: загружено не меньше минимума, нет идущих загрузок. Фото с ошибкой отправке не мешают, они просто не попадут в список. */
export function canSubmitPhotos(uploaded: number, busy: boolean): boolean {
  return !busy && uploaded >= TRIP_PHOTOS_MIN && uploaded <= TRIP_PHOTOS_MAX
}
