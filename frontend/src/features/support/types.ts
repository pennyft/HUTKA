/** Типы из support/dto/*.java и support/enums/*.java. Даты приходят ISO-8601 (UTC). */
export type TicketCategory = 'booking' | 'payment' | 'technical' | 'dispute' | 'other'
export type TicketPriority = 'normal' | 'urgent'
export type TicketStatus = 'open' | 'closed'
/** system создаёт платформа (например, автоскрытие машины), в списке пользователя таких нет. */
export type TicketAudience = 'renter' | 'partner' | 'system'
/** Кабинет, из которого пишут: от него зависит параметр audience и адрес страниц. */
export type Cabinet = 'renter' | 'partner'
export type MessageAuthor = 'user' | 'admin' | 'ai'

/** Строка списка GET /tickets. */
export interface Ticket {
  id: string
  audience: TicketAudience
  subject: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  updatedAt: string
  closedAt: string | null
  reopenedAt: string | null
  /** Решение сервера: закрыт не больше 7 дней назад. */
  canReopen: boolean
  /** Крайний срок переоткрытия, null у незакрытого тикета. */
  reopenableUntil: string | null
}

export interface TicketList {
  /** Всего тикетов по фильтру, items это одна страница. */
  total: number
  items: Ticket[]
}

export interface TicketMessage {
  id: string
  authorType: MessageAuthor
  body: string
  createdAt: string
}

/** GET /tickets/{id}. Первое сообщение переписки это description, затем messages по времени. */
export interface TicketDetail extends Ticket {
  description: string
  messages: TicketMessage[]
}

/** POST /tickets. audience подставляем из кабинета, priority по умолчанию normal. */
export interface CreateTicketBody {
  category: TicketCategory
  subject: string
  description: string
  priority: TicketPriority
  audience: Exclude<TicketAudience, 'system'>
}

/** Черновик для формы: так её будет предзаполнять AI-помощник (B22, поле ticketDraft), через location.state.draft. */
export interface TicketDraft {
  category?: TicketCategory
  subject?: string
  description?: string
  priority?: TicketPriority
}
