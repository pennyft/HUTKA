/**
 * Цвета статусов в hex — для мест, где нельзя использовать CSS-классы (маркеры карты Leaflet).
 * Значения из Hutka.md, разд. 22.1–22.2; дублируют токены в src/styles/index.css, при изменении правьте оба места.
 */
export const CAR_STATUS_COLOR = {
  available: '#22C55E',
  reserved: '#F97316',
  in_trip: '#3B82F6',
  under_review: '#EF4444',
} as const

export const BOOKING_STATUS_COLOR = {
  pending: '#3B82F6',
  active: '#3B82F6',
  finished: '#71717A',
  cancelled: '#71717A',
} as const

export type CarStatus = keyof typeof CAR_STATUS_COLOR
export type BookingStatus = keyof typeof BOOKING_STATUS_COLOR

export const CAR_STATUS_LABEL: Record<CarStatus, string> = {
  available: 'Свободна',
  reserved: 'Забронирована',
  in_trip: 'В поездке',
  under_review: 'На проверке',
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Ожидает',
  active: 'Идёт поездка',
  finished: 'Завершена',
  cancelled: 'Отменена',
}
