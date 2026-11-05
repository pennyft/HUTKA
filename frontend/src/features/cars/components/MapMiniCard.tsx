import { Link } from 'react-router'
import { Star, X } from 'lucide-react'
import { CAR_STATUS_LABEL } from '@/shared/config/statusColors'
import { Skeleton } from '@/shared/ui/Skeleton'
import type { Car } from '@/shared/types/car'
import { formatDistance, formatPrice, formatRating } from '../format'
import { CarPhoto } from './CarPhoto'

interface Props {
  /** undefined = данные ещё грузятся */
  car?: Car
  onClose: () => void
}

/** Карточка выбранной машины поверх карты: фото, название, цена и переход на страницу машины. */
export function MapMiniCard({ car, onClose }: Props) {
  return (
    <div className="absolute inset-x-3 bottom-3 z-[500] flex items-center gap-3 rounded-2xl border border-line bg-surface p-2.5 shadow-pop">
      {car ? (
        <>
          <CarPhoto src={car.photos[0]} className="h-14 w-[4.5rem] shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-fg">
              {car.make} {car.model}
            </p>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted">
              {car.ratingAvg && car.ratingAvg > 0 ? (
                <span className="inline-flex items-center gap-0.5">
                  <Star className="size-3 fill-current" aria-hidden />
                  {formatRating(car.ratingAvg)}
                </span>
              ) : null}
              {car.distanceKm !== null && <span>{formatDistance(car.distanceKm)}</span>}
              <span>{CAR_STATUS_LABEL[car.status]}</span>
            </p>
            <p className="text-sm font-bold text-fg">
              {formatPrice(car.pricePerHour)} <span className="text-xs font-normal text-muted">BYN/ч</span>
            </p>
          </div>
          <Link to={`/cars/${car.id}`} className="shrink-0 rounded-xl bg-primary px-3.5 py-2 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover">
            Открыть
          </Link>
        </>
      ) : (
        <>
          <Skeleton className="h-14 w-[4.5rem] shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </>
      )}
      <button type="button" onClick={onClose} aria-label="Закрыть карточку" className="absolute -right-1.5 -top-1.5 flex size-7 items-center justify-center rounded-full border border-line bg-surface text-fg hover:bg-surface-2">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
