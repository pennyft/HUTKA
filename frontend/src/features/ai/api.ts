import { http } from '@/api/http'
import type { AiCabinet, AiResponse, AiTicketDraft } from './types'

export interface AiChatBody {
  message: string
  page?: string
  cabinet: AiCabinet
  history: { role: 'user' | 'assistant'; content: string }[]
}

export const aiApi = {
  /**
   * POST /ai/chat. Историю хранит и присылает клиент (бэк использует последние 10 реплик, принимает до 40).
   * Роль system бэк не принимает. Текст до 2000 символов.
   */
  chat: (body: AiChatBody, signal?: AbortSignal) => http.request<AiResponse>('/ai/chat', { method: 'POST', body, signal }),

  /** Черновик AI превращается в обычное обращение: POST /tickets (audience по кабинету). */
  createTicket: (draft: AiTicketDraft, audience: AiCabinet) =>
    http.request<{ id: string }>('/tickets', {
      method: 'POST',
      body: { category: draft.category, subject: draft.subject, description: draft.description, priority: draft.priority, audience },
    }),
}
