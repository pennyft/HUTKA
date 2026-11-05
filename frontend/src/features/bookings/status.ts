import type { Booking, BookingStatus } from './types'

/** Числа из BookingRules бэка (booking/BookingRules.java). */
export const PARTNER_RESPONSE_MS = 6 * 60 * 60_000 // партнёр отвечает на заявку 6 часов
export const NO_SHOW_MS = 60 * 60_000 // не начали поездку через час после planned_start: бронь отменяется
export const ESCALATION_MS = 3 * 60 * 60_000 // просрочка возврата больше 3 часов уходит в спор

/** Этап брони для интерфейса. В API это pending/active/finished/cancelled, но pending делится на два случая. */
export type BookingPhase = 'awaiting_partner' | 'confirmed' | 'active' | 'finished' | 'cancelled'

export type BookingTab = 'pending' | 'active' | 'finished' | 'cancelled'

export const TAB_ORDER: BookingTab[] = ['active', 'pending', 'finished', 'cancelled']
export const TAB_LABEL: Record<BookingTab, string> = {
  pending: 'Ожидают',
  active: 'Активные',
  finished: 'Завершённые',
  cancelled: 'Отменённые',
}

type PhaseInput = Pick<Booking, 'status' | 'confirmedAt'>

export function bookingPhase(b: PhaseInput): BookingPhase {
  if (b.status === 'pending') return b.confirmedAt ? 'confirmed' : 'awaiting_partner'
  return b.status
}

/** Подпись статуса: «Ждёт партнёра» и «Подтверждена» различаем по confirmedAt (pending без confirmedAt = ждёт ответа). */
export function bookingStatusLabel(b: PhaseInput): string {
  const phase = bookingPhase(b)
  if (phase === 'awaiting_partner') return 'Ждёт партнёра'
  if (phase === 'confirmed') return 'Подтверждена'
  return { active: 'Идёт поездка', finished: 'Завершена', cancelled: 'Отменена' }[phase]
}

export function bookingTab(b: PhaseInput): BookingTab {
  return b.status
}

/** Срок ответа партнёра: 6 часов с момента создания заявки. */
export function partnerDeadline(b: Pick<Booking, 'createdAt'>): Date {
  return new Date(new Date(b.createdAt).getTime() + PARTNER_RESPONSE_MS)
}

/** До этого момента нужно начать поездку, иначе бронь отменится автоматически. */
export function noShowDeadline(b: Pick<Booking, 'plannedStartAt'>): Date {
  return new Date(new Date(b.plannedStartAt).getTime() + NO_SHOW_MS)
}

/** Просрочка возврата в миллисекундах (0, если поездка не идёт или ещё в пределах плана). */
export function overdueMs(b: Pick<Booking, 'status' | 'plannedEndAt'>, now: Date): number {
  if (b.status !== 'active') return 0
  return Math.max(0, now.getTime() - new Date(b.plannedEndAt).getTime())
}

/** Можно ли начать поездку: бронь подтверждена и плановое время наступило (бэк: не раньше planned_start_at). */
export function canStartNow(b: Pick<Booking, 'status' | 'confirmedAt' | 'plannedStartAt'>, now: Date): boolean {
  return bookingPhase(b) === 'confirmed' && now.getTime() >= new Date(b.plannedStartAt).getTime()
}

/** Вкладка по умолчанию: первая непустая в порядке «активные, ожидают, завершённые, отменённые». */
export function defaultTab(counts: Record<BookingTab, number>): BookingTab {
  return TAB_ORDER.find((t) => counts[t] > 0) ?? 'pending'
}

/** Порядок внутри вкладки: ближайшие вперёд, история от новых к старым. */
export function sortForTab(tab: BookingTab, list: Booking[]): Booking[] {
  const t = (iso: string | null) => (iso ? new Date(iso).getTime() : 0)
  const copy = [...list]
  switch (tab) {
    case 'pending':
      return copy.sort((a, b) => t(a.plannedStartAt) - t(b.plannedStartAt))
    case 'active':
      return copy.sort((a, b) => t(a.plannedEndAt) - t(b.plannedEndAt))
    case 'finished':
      return copy.sort((a, b) => t(b.actualEndAt ?? b.plannedEndAt) - t(a.actualEndAt ?? a.plannedEndAt))
    case 'cancelled':
      return copy.sort((a, b) => t(b.createdAt) - t(a.createdAt))
  }
}

export function countByTab(list: Pick<Booking, 'status'>[]): Record<BookingTab, number> {
  const counts: Record<BookingTab, number> = { pending: 0, active: 0, finished: 0, cancelled: 0 }
  for (const b of list) counts[b.status as BookingStatus]++
  return counts
}
