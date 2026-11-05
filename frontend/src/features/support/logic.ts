import type { Cabinet, TicketDetail, TicketDraft, TicketMessage, TicketStatus } from './types'
import { CATEGORY_ORDER } from './labels'
import type { TicketFormValues } from './schema'

/** Страницы поддержки общие для двух кабинетов (/app/support и /partner/support): кабинет определяем по адресу. */
export function cabinetOf(pathname: string): Cabinet {
  return pathname.startsWith('/partner') ? 'partner' : 'renter'
}

export function supportBase(cabinet: Cabinet): string {
  return cabinet === 'partner' ? '/partner/support' : '/app/support'
}

export type StatusFilter = 'all' | 'open' | 'closed'

export function parseStatusFilter(v: string | null): StatusFilter {
  return v === 'open' || v === 'closed' ? v : 'all'
}

export const toApiStatus = (f: StatusFilter): TicketStatus | undefined => (f === 'all' ? undefined : f)

export interface ConversationItem {
  id: string
  authorType: TicketMessage['authorType']
  body: string
  createdAt: string
}

/** Переписка: первым идёт описание обращения (его написал пользователь), дальше сообщения по времени. */
export function conversation(t: TicketDetail): ConversationItem[] {
  return [{ id: 'description', authorType: 'user', body: t.description, createdAt: t.createdAt }, ...t.messages]
}

export type ReopenState = { kind: 'not_closed' } | { kind: 'can'; until: string | null } | { kind: 'expired' }

/**
 * Можно ли переоткрыть. Берём решение сервера (canReopen) и дополнительно сверяем срок с текущим временем:
 * страница могла пролежать открытой дольше, чем осталось до границы в 7 дней.
 */
export function reopenState(t: Pick<TicketDetail, 'status' | 'canReopen' | 'reopenableUntil'>, now: Date): ReopenState {
  if (t.status !== 'closed') return { kind: 'not_closed' }
  const beforeDeadline = t.reopenableUntil === null || new Date(t.reopenableUntil).getTime() >= now.getTime()
  return t.canReopen && beforeDeadline ? { kind: 'can', until: t.reopenableUntil } : { kind: 'expired' }
}

/** Черновик из AI-помощника в значения формы. Неизвестная категория отбрасывается. */
export function draftToValues(draft: TicketDraft | null | undefined): TicketFormValues {
  const category = draft?.category && CATEGORY_ORDER.includes(draft.category) ? draft.category : ''
  return {
    category,
    subject: draft?.subject ?? '',
    description: draft?.description ?? '',
    urgent: draft?.priority === 'urgent',
  }
}

/** Достаём черновик из location.state, не доверяя его форме. */
export function readDraft(state: unknown): TicketDraft | null {
  if (typeof state !== 'object' || state === null || !('draft' in state)) return null
  const d = (state as { draft: unknown }).draft
  return typeof d === 'object' && d !== null ? (d as TicketDraft) : null
}
