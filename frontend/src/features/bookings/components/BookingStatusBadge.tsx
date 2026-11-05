import { BOOKING_STATUS_COLOR } from '@/shared/config/statusColors'
import { bookingStatusLabel } from '../status'
import type { Booking } from '../types'

/**
 * Статус брони: цветная точка и графитовый текст (сам цвет как цвет текста не проходит контраст, см. StatusBadge).
 * В отличие от общего StatusBadge различает «Ждёт партнёра» и «Подтверждена».
 */
export function BookingStatusBadge({ booking }: { booking: Pick<Booking, 'status' | 'confirmedAt'> }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs font-medium text-fg">
      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: BOOKING_STATUS_COLOR[booking.status] }} />
      {bookingStatusLabel(booking)}
    </span>
  )
}
