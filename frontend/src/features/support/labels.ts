import type { MessageAuthor, TicketCategory, TicketPriority, TicketStatus } from './types'

/** Названия категорий из ТЗ (комментарий в TicketCategory.java): Бронирование, Оплата и выплаты, Техническая проблема, Спор, Другое. */
export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  booking: 'Бронирование',
  payment: 'Оплата и выплаты',
  technical: 'Техническая проблема',
  dispute: 'Спор',
  other: 'Другое',
}

export const CATEGORY_ORDER: TicketCategory[] = ['booking', 'payment', 'technical', 'dispute', 'other']

export const PRIORITY_LABEL: Record<TicketPriority, string> = { normal: 'Обычный', urgent: 'Срочный' }

export const STATUS_LABEL: Record<TicketStatus, string> = { open: 'Открыто', closed: 'Закрыто' }

/** Личность администратора бэк не раскрывает (authorType = admin это просто «Поддержка»). */
export const AUTHOR_LABEL: Record<MessageAuthor, string> = { user: 'Вы', admin: 'Поддержка', ai: 'AI-помощник' }
