export type TripStatus = 'open' | 'closed' | 'finished' | 'cancelled'

/** Элемент списка GET /group-trips (GroupTripResponse). */
export interface TripSummary {
  id: string
  organizerId: string
  organizerName: string
  route: string
  /** Дата поездки YYYY-MM-DD (по минскому времени) */
  date: string
  status: TripStatus
  maxParticipants: number
  participantsCount: number
  full: boolean
  joined: boolean
  createdAt: string
}

export interface Participant {
  userId: string
  /** «Иван П.»: имя и первая буква фамилии, без телефона и почты (GroupTripRules.displayName) */
  displayName: string
  ratingAvg: number | null
  organizer: boolean
  joinedAt: string
}

/** GroupTripDetailResponse: GET /group-trips/{id} и ответы join/close/cancel. */
export interface TripDetail {
  id: string
  organizerId: string
  route: string
  date: string
  status: TripStatus
  maxParticipants: number
  participantsCount: number
  full: boolean
  joined: boolean
  chatAvailable: boolean
  createdAt: string
  closedAt: string | null
  cancelledAt: string | null
  participants: Participant[]
}

export interface TripList {
  total: number
  items: TripSummary[]
}

/** Сообщение чата: и в истории, и в реальном времени (ChatMessageResponse). */
export interface ChatMessage {
  id: string
  tripId: string
  senderId: string | null
  senderName: string | null
  body: string
  createdAt: string
}

export interface ChatHistory {
  total: number
  /** Новые первыми: page = 0 содержит самые свежие сообщения */
  items: ChatMessage[]
}

export interface CreateTripBody {
  route: string
  maxParticipants: number
  date: string
}
