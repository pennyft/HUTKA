import type { TicketAudience, TicketCategory, TicketPriority } from '@/features/support/types'
import type { TicketsQuery } from './api'
import type { AdminTicketDetail, AdminTicketMessage, TicketFilters } from './types'

export const AUDIENCE_LABEL: Record<TicketAudience, string> = { renter: 'Арендатор', partner: 'Партнёр', system: 'Система' }
export const AUDIENCES: TicketAudience[] = ['renter', 'partner', 'system']

const CATEGORIES: TicketCategory[] = ['booking', 'payment', 'technical', 'dispute', 'other']
const PRIORITIES: TicketPriority[] = ['normal', 'urgent']

/** Фильтры очереди из адреса (?tab=closed&priority=urgent&category=payment&audience=partner&page=2, страница с 1). */
export function parseTicketFilters(sp: URLSearchParams): TicketFilters {
  const page = Number(sp.get('page'))
  const pick = <T extends string>(k: string, allowed: T[]): '' | T => (allowed.includes(sp.get(k) as T) ? (sp.get(k) as T) : '')
  return {
    tab: sp.get('tab') === 'closed' ? 'closed' : 'open',
    priority: pick('priority', PRIORITIES),
    category: pick('category', CATEGORIES),
    audience: pick('audience', AUDIENCES),
    page: Number.isInteger(page) && page >= 1 ? page - 1 : 0,
  }
}

export function ticketFiltersToParams(f: TicketFilters): Record<string, string> {
  const out: Record<string, string> = {}
  if (f.tab === 'closed') out.tab = 'closed'
  if (f.priority) out.priority = f.priority
  if (f.category) out.category = f.category
  if (f.audience) out.audience = f.audience
  if (f.page > 0) out.page = String(f.page + 1)
  return out
}

export function ticketFiltersToQuery(f: TicketFilters): TicketsQuery {
  const q: TicketsQuery = { status: f.tab, page: f.page }
  if (f.priority) q.priority = f.priority
  if (f.category) q.category = f.category
  if (f.audience) q.audience = f.audience
  return q
}

/** «45 с», «12 мин», «2 ч 15 мин», «1 д 3 ч». null: данных нет. */
export function durationText(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return '—'
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s} с`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} мин`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} ч ${m % 60} мин`
  return `${Math.floor(h / 24)} д ${h % 24} ч`
}

/** «ждёт ответа 3 ч 10 мин»; null, если ответа не требуется. */
export function waitingText(since: string | null, now: Date): string | null {
  if (!since) return null
  const ms = now.getTime() - new Date(since).getTime()
  if (Number.isNaN(ms)) return null
  const m = Math.floor(ms / 60_000)
  return m < 1 ? 'ждёт ответа меньше минуты' : `ждёт ответа ${durationText(m * 60)}`
}

export const REPLY_MAX = 4000
export function replyProblem(text: string): string | null {
  const t = text.trim()
  if (!t) return 'Введите ответ'
  if (t.length > REPLY_MAX) return `Не больше ${REPLY_MAX} символов`
  return null
}

export interface ConversationItem {
  id: string
  authorType: AdminTicketMessage['authorType']
  authorName: string | null
  body: string
  createdAt: string
}

/** Переписка: первым описание обращения от автора, затем сообщения по порядку. У системного тикета автора нет. */
export function conversation(t: AdminTicketDetail): ConversationItem[] {
  return [{ id: 'description', authorType: 'user', authorName: t.requester?.name ?? null, body: t.description, createdAt: t.createdAt }, ...t.messages]
}

/** Подпись автора: пользователь по имени, администратор по имени («Поддержка», если пусто), AI всегда «AI-помощник». */
export function authorLabel(m: Pick<ConversationItem, 'authorType' | 'authorName'>): string {
  if (m.authorType === 'ai') return 'AI-помощник'
  if (m.authorType === 'admin') return m.authorName ?? 'Поддержка'
  return m.authorName ?? 'Пользователь'
}
