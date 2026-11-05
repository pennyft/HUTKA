import type { AdminCar, CarTab } from './types'

export const CAR_TABS: { value: CarTab; label: string }[] = [
  { value: 'pending', label: 'Заявки' },
  { value: 'approved', label: 'Одобренные' },
  { value: 'rejected', label: 'Отклонённые' },
  { value: 'strikes', label: 'Скрыты по неявкам' },
  { value: 'admin', label: 'Скрыты администратором' },
]

export function parseCarTab(v: string | null): CarTab {
  return CAR_TABS.some((t) => t.value === v) ? (v as CarTab) : 'pending'
}

/** Вкладка в параметры запроса. Вкладка «Заявки» ещё и значение по умолчанию на бэке. */
export function tabQuery(tab: CarTab): Record<string, string | boolean> {
  if (tab === 'strikes') return { hiddenByStrikes: true }
  if (tab === 'admin') return { hiddenByAdmin: true }
  return { moderationStatus: tab }
}

export interface AdminCarBadge {
  label: string
  warn: boolean
}

/** Метки машины: модерация, скрытие (администратором, по неявкам со счётчиком, партнёром), состояние. */
export function adminCarBadges(c: AdminCar): AdminCarBadge[] {
  const out: AdminCarBadge[] = []
  if (c.moderationStatus === 'pending') out.push({ label: 'На модерации', warn: false })
  if (c.moderationStatus === 'rejected') out.push({ label: 'Отклонена', warn: true })
  if (c.hiddenByAdmin) out.push({ label: 'Скрыта администратором', warn: true })
  if (c.hiddenByStrikes) out.push({ label: `Скрыта по неявкам (${c.noShowStrikes})`, warn: true })
  if (c.hidden && !c.hiddenByAdmin && !c.hiddenByStrikes) out.push({ label: 'Скрыта партнёром', warn: false })
  if (c.status === 'under_review') out.push({ label: 'На проверке (спор)', warn: false })
  if (c.status === 'in_trip') out.push({ label: 'В поездке', warn: false })
  return out
}

/**
 * Какие действия доступны по состоянию (сервер всё равно перепроверит и ответит 409 с текстом):
 * одобрить и отклонить только заявку pending; скрыть одобренную, ещё не скрытую администратором; вернуть из скрытия администратором
 * или по неявкам; удалить можно любую, но сервер откажет при завершённых поездках и активных бронях.
 */
export function carActions(c: AdminCar) {
  return {
    moderate: c.moderationStatus === 'pending',
    hide: c.moderationStatus === 'approved' && !c.hiddenByAdmin,
    unhide: c.hiddenByAdmin,
    returnToCatalog: c.hiddenByStrikes,
    remove: true,
  }
}

/** Если у машины сразу два вида скрытия, возврат из одного не покажет её в каталоге, пока не снято второе. */
export const hasDoubleHiding = (c: Pick<AdminCar, 'hiddenByAdmin' | 'hiddenByStrikes'>): boolean => c.hiddenByAdmin && c.hiddenByStrikes

export type InspectionState = { kind: 'expired'; days: number } | { kind: 'soon'; days: number } | { kind: 'ok'; days: number }

/** Техосмотр относительно сегодняшнего дня (оба в формате YYYY-MM-DD): просрочен, истекает в ближайшие 30 дней или в порядке. */
export function inspectionState(expiry: string, today: string): InspectionState {
  const d = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN
  }
  const days = Math.round((d(expiry) - d(today)) / 86_400_000)
  if (days < 0) return { kind: 'expired', days: -days }
  return days <= 30 ? { kind: 'soon', days } : { kind: 'ok', days }
}
