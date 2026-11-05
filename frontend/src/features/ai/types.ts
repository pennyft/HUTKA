export type AiStatus = 'ok' | 'unavailable' | 'rate_limited'
export type AiCabinet = 'renter' | 'partner'

/** Машина из подбора (AiCarSuggestion). Данные берутся из каталога, а не из ответа модели, так что выдуманных машин нет. */
export interface AiCar {
  id: string
  make: string
  model: string
  year: number | null
  pricePerHour: number | null
  seats: number | null
  fuelType: string | null
  transmission: string | null
  bodyType: string | null
  ratingAvg: number | null
  photoUrl: string | null
}

/** Черновик тикета: category booking|payment|technical|dispute|other, priority normal|urgent (AiTicketDraft). */
export interface AiTicketDraft {
  category: string
  priority: string
  subject: string
  description: string
}

/** Ответ POST /ai/chat. Всегда 200: недоступность и лимит запросов это штатные статусы, а не ошибки. */
export interface AiResponse {
  status: AiStatus
  reply: string
  cars: AiCar[] | null
  createdTicket: { id: string; priority: string } | null
  ticketDraft: AiTicketDraft | null
  emergency: boolean
}

export interface ChatEntry {
  id: string
  role: 'user' | 'assistant'
  text: string
  /** Реплика о сбое запроса (сеть, 5xx): в историю для модели не попадает */
  failed?: boolean
  /** Для failed: что отправить повторно */
  retryText?: string
  status?: AiStatus
  cars?: AiCar[]
  createdTicket?: { id: string; priority: string }
  ticketDraft?: AiTicketDraft
  /** Черновик уже отправлен как обращение */
  ticketSentId?: string
  emergency?: boolean
}
