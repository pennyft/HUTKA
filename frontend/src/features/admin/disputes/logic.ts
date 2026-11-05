import type { DisputeDecision, DisputeStatus } from '../bookings/types'
import type { ResolveBody } from './types'

export const DECISION_LABEL: Record<DisputeDecision, string> = { renter_favor: 'В пользу арендатора', partner_favor: 'В пользу партнёра' }

export const DISPUTE_TABS: { value: DisputeStatus; label: string }[] = [
  { value: 'open', label: 'Открытые' },
  { value: 'resolved', label: 'Решённые' },
]
export const parseDisputeTab = (v: string | null): DisputeStatus => (v === 'resolved' ? 'resolved' : 'open')

export const DISPUTE_EVENT_LABEL: Record<string, string> = {
  booking_created: 'Бронь создана',
  booking_confirmed: 'Подтверждена партнёром',
  trip_started: 'Поездка началась',
  dispute_opened: 'Спор открыт: возврат просрочен больше чем на 3 часа',
  trip_finished: 'Поездка завершена',
  dispute_resolved: 'Спор решён',
}
export const disputeEventLabel = (e: string): string => DISPUTE_EVENT_LABEL[e] ?? e

/** Предел суммы ущерба (DisputeRules.MAX_DAMAGE). */
export const MAX_DAMAGE = 99_999_999.99

/** Сумма из поля: «1500», «1500,5», «0.00». Не по формату (больше двух знаков, буквы, минус) даёт NaN. */
export function parseDamage(raw: string): number {
  const t = raw.trim()
  return /^\d+([.,]\d{1,2})?$/.test(t) ? Number(t.replace(',', '.')) : NaN
}

/**
 * Проверка решения как в DisputeRules: в пользу арендатора ущерб не признаётся (поле пустое или 0), в пользу партнёра сумма обязательна
 * (0,00 допустимо, например если партнёр прав по существу, но ущерба нет), не отрицательная, до двух знаков, не больше 99 999 999,99.
 */
export function resolveProblem(decision: DisputeDecision | '', raw: string): string | null {
  if (!decision) return 'Выберите, в чью пользу решение'
  const t = raw.trim()
  if (decision === 'renter_favor') {
    if (t === '') return null
    const n = parseDamage(t)
    return n === 0 ? null : 'При решении в пользу арендатора сумма ущерба должна быть пустой или нулевой'
  }
  if (t === '') return 'Укажите признанную сумму ущерба (можно 0,00)'
  if (t.startsWith('-')) return 'Сумма ущерба не может быть отрицательной'
  const n = parseDamage(t)
  if (Number.isNaN(n)) return 'Сумма: число не более чем с двумя знаками после запятой'
  if (n > MAX_DAMAGE) return 'Сумма ущерба слишком велика'
  return null
}

/** Тело запроса. renter_favor без суммы, partner_favor с числом. Вызывать после resolveProblem(...) === null. */
export function buildResolveBody(decision: DisputeDecision, raw: string): ResolveBody {
  return decision === 'renter_favor' ? { decision } : { decision, damageAmount: parseDamage(raw) }
}
