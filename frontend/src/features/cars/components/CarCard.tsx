import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Star } from 'lucide-react'
import { FavoriteButton } from '@/shared/favorites/FavoriteButton'
import { CAR_STATUS_LABEL } from '@/shared/config/statusColors'
import { Skeleton } from '@/shared/ui/Skeleton'
import type { Car } from '@/shared/types/car'
import { formatDistance, formatPrice, formatRating, formatSeats } from '../format'
import { TRANSMISSION_LABEL } from '../labels'
import { CarPhoto } from './CarPhoto'

interface Props {
  car: Car
  /** Подсветка, когда на эту машину наведён ценник на карте */
  highlighted?: boolean
  onHover?: (id: string | null) => void
}

/**
 * Карточка машины в каталоге. Вся карточка ссылка на /cars/{id}; сердечко лежит рядом со ссылкой, а не внутри
 * (кнопка внутри ссылки недопустима и не должна открывать карточку).
 */
export function CarCard({ car, highlighted, onHover }: Props) {
  const meta: ReactNode[] = [car.year, TRANSMISSION_LABEL[car.transmission], formatSeats(car.seats)]
  if (car.ratingAvg && car.ratingAvg > 0) {
    meta.push(
      <span key="rating" className="inline-flex items-center gap-0.5">
        <Star className="size-3 fill-current" aria-hidden />
        {formatRating(car.ratingAvg)}
      </span>,
    )
  }
  if (car.distanceKm !== null) meta.push(formatDistance(car.distanceKm))

  return (
    <article className="group relative" onMouseEnter={() => onHover?.(car.id)} onMouseLeave={() => onHover?.(null)}>
      <Link to={`/cars/${car.id}`} className="block rounded-2xl">
        <div className={`relative aspect-[16/10] overflow-hidden rounded-2xl bg-surface-2 ${highlighted ? 'ring-2 ring-primary' : ''}`}>
          <CarPhoto src={car.photos[0]} className="size-full transition-transform duration-300 group-hover:scale-[1.03]" />
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5">
            {car.bookingMode === 'instant' && <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-fg">Подтверждает сразу</span>}
            {car.status !== 'available' && <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-fg">{CAR_STATUS_LABEL[car.status]}</span>}
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <h3 className="truncate font-bold text-fg">
            {car.make} {car.model}
          </h3>
          <p className="shrink-0 font-bold text-fg">
            {formatPrice(car.pricePerHour)} <span className="text-xs font-normal text-muted">BYN/ч</span>
          </p>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {meta.map((m, i) => (
            <Fragment key={i}>
              {i > 0 && ' · '}
              {m}
            </Fragment>
          ))}
        </p>
      </Link>
      <FavoriteButton car={car} className="absolute right-2 top-2" />
    </article>
  )
}

export function CarCardSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="aspect-[16/10] w-full rounded-2xl" />
      <Skeleton className="mt-2 h-5 w-3/4" />
      <Skeleton className="mt-1.5 h-4 w-1/2" />
    </div>
  )
}
