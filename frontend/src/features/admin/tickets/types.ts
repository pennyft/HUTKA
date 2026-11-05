import type { MessageAuthor, TicketAudience, TicketCategory, TicketPriority, TicketStatus } from '@/features/support/types'

/** adminapi/dto/AdminTicketSummary.java: userId и requesterName пусты у системного тикета (audience = system). */
export interface AdminTicketSummary {
  id: string
  userId: string | null
  requesterName: string | null
  audience: TicketAudience
  subject: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  updatedAt: string
  /** С какого момента тикет ждёт ответа администратора. null: ответ не требуется или тикет закрыт. */
  awaitingAdminSince: string | null
  closedAt: string | null
}

export interface AdminTicketMessage {
  id: string
  authorType: MessageAuthor
  authorId: string | null
  /** У сообщения AI пусто: подписываем по authorType. */
  authorName: string | null
  body: string
  createdAt: string
}

/** adminapi/dto/AdminTicketDetailResponse.java. */
export interface AdminTicketDetail {
  id: string
  audience: TicketAudience
  requester: { id: string; name: string | null; email: string | null; phone: string | null; partner: boolean } | null
  subject: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  createdAt: string
  updatedAt: string
  awaitingAdminSince: string | null
  firstAdminReplyAt: string | null
  closedAt: string | null
  closedByAdminId: string | null
  closedByAdminName: string | null
  reopenedAt: string | null
  messages: AdminTicketMessage[]
}

/** adminapi/dto/AdminTicketStatsResponse.java. Время первого ответа считается по тикетам пользователей за последние windowDays дней. */
export interface TicketStats {
  openTotal: number
  openUrgent: number
  awaitingAnswer: number
  windowDays: number
  answeredInWindow: number
  avgFirstResponseSeconds: number | null
  medianFirstResponseSeconds: number | null
}

export type TicketTab = 'open' | 'closed'

export interface TicketFilters {
  tab: TicketTab
  priority: '' | TicketPriority
  category: '' | TicketCategory
  audience: '' | TicketAudience
  page: number
}
