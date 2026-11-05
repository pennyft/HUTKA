import { Link } from 'react-router'
import { CarPhoto } from '@/features/cars/components/CarPhoto'
import { Skeleton } from '@/shared/ui/Skeleton'
import { formatMoney } from '../format'
import type { CarLookup } from '../hooks'
import { formatPeriod } from '../period'
import type { Booking } from '../types'
import { BookingStatusBadge } from './BookingStatusBadge'

/** Карточка брони в списке «Мои поездки». Вся карточка ссылка на экран брони. */
export function BookingListCard({ booking, lookup }: { booking: Booking; lookup?: CarLookup }) {
  const finished = booking.status === 'finished' && booking.finalPrice !== null
  const title = lookup?.car ? `${lookup.car.make} ${lookup.car.model}` : lookup?.missing ? 'Автомобиль недоступен' : null

  return (
    <Link to={`/app/bookings/${booking.id}`} className="flex gap-4 rounded-3xl border border-line bg-surface p-3 transition-colors hover:bg-surface-2 sm:p-4">
      <CarPhoto src={lookup?.car?.photos?.[0]} className="h-20 w-28 shrink-0 rounded-2xl sm:h-24 sm:w-36" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          {title ? <h3 className="truncate font-bold text-fg">{title}</h3> : <Skeleton className="h-5 w-32" />}
          <BookingStatusBadge booking={booking} />
        </div>
        <p className="mt-1 text-sm text-muted">{formatPeriod(booking.plannedStartAt, booking.plannedEndAt)}</p>
        <p className="mt-2 text-sm text-fg">
          <span className="font-bold">{formatMoney(finished ? booking.finalPrice! : booking.priceEstimate)} BYN</span>
          {!finished && booking.status !== 'cancelled' && <span className="text-xs text-muted"> · предварительно</span>}
        </p>
      </div>
    </Link>
  )
}
