import type { PartnerCar } from './types'

export interface Badge {
  label: string
  tone: 'neutral' | 'warn'
}

/** Метки на карточке машины: модерация, скрытие (администратор, неявки со счётчиком, партнёр), проверка после спора. */
export function carBadges(c: PartnerCar): Badge[] {
  const out: Badge[] = []
  if (c.moderationStatus === 'pending') out.push({ label: 'На модерации', tone: 'neutral' })
  if (c.moderationStatus === 'rejected') out.push({ label: 'Отклонена', tone: 'warn' })
  if (c.hiddenByAdmin) out.push({ label: 'Скрыта администратором', tone: 'warn' })
  if (c.hiddenByStrikes) out.push({ label: `Скрыта из-за неявок (${c.noShowStrikes})`, tone: 'warn' })
  if (c.hidden && !c.hiddenByAdmin && !c.hiddenByStrikes) out.push({ label: 'Скрыта вами', tone: 'neutral' })
  if (c.status === 'under_review') out.push({ label: 'На проверке', tone: 'neutral' })
  if (c.status === 'in_trip') out.push({ label: 'В поездке', tone: 'neutral' })
  return out
}

export type VisibilityState = { kind: 'toggle'; hide: boolean } | { kind: 'locked'; reason: string } | { kind: 'unavailable' }

/**
 * Кнопка «Скрыть/Показать». Показать машину, скрытую администратором или по неявкам, партнёр не может (403), вернуть её может только
 * администратор, поэтому кнопка заблокирована с объяснением. Машине без одобрения скрытие ни к чему.
 */
export function visibilityState(c: PartnerCar): VisibilityState {
  if (c.moderationStatus !== 'approved') return { kind: 'unavailable' }
  if (c.hiddenByAdmin) return { kind: 'locked', reason: 'Машину скрыл администратор, вернуть её может только он.' }
  if (c.hiddenByStrikes) return { kind: 'locked', reason: 'Машина скрыта из-за неявок, вернуть её может только администратор.' }
  return { kind: 'toggle', hide: !c.hidden }
}
