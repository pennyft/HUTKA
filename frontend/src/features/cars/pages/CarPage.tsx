import { lazy, Suspense, useEffect, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, SearchX, Star } from 'lucide-react'
import { ApiError, errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import type { Car } from '@/shared/types/car'
import { BookingCard, MobileBookBar } from '../components/BookingPanel'
import { CarReviews } from '../components/CarReviews'
import { reviewsCountLabel, useCarReviews } from '../components/useCarReviews'
import { Gallery } from '../components/Gallery'
import { useBookCta } from '../components/useBookCta'
import { carsApi } from '../api'
import { formatMileage, formatRating, formatSeats } from '../format'
import { FUEL_LABEL, TRANSMISSION_LABEL } from '../labels'

// Карта (Leaflet) нужна не сразу: отдельный кусок, как и в каталоге
const CarMiniMap = lazy(() => import('../components/CarMiniMap'))

/**
 * B5. Карточка машины: GET /cars/{id} (публичный), отзывы GET /ratings?carId= (нужен токен).
 * 404 бэк отдаёт для скрытых и не прошедших модерацию машин.
 */
export default function CarPage() {
  const { carId = '' } = useParams()
  const { data: car, isPending, isError, error, refetch } = useQuery({
    queryKey: ['car', carId],
    queryFn: ({ signal }) => carsApi.details(carId, signal),
  })

  useEffect(() => {
    if (!car) return
    const prev = document.title
    document.title = `${car.make} ${car.model} — Hutka`
    return () => {
      document.title = prev
    }
  }, [car])

  if (isPending) return <PageSkeleton />
  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404
    return (
      <Shell>
        <div className="rounded-3xl border border-line bg-surface p-8">
          <SearchX className="mb-3 size-6 text-muted" aria-hidden />
          <h1 className="text-lg font-bold text-fg">{notFound ? 'Машина недоступна' : 'Не удалось загрузить машину'}</h1>
          <p className="mt-1 text-sm text-muted">{notFound ? 'Возможно, её скрыли или она ещё не прошла проверку.' : errorMessage(error)}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link to="/cars" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover">
              В каталог
            </Link>
            {!notFound && (
              <Button variant="outline" onClick={() => refetch()} className="w-auto">
                Повторить
              </Button>
            )}
          </div>
        </div>
      </Shell>
    )
  }
  return <CarContent car={car} />
}

function CarContent({ car }: { car: Car }) {
  const cta = useBookCta(car)
  const reviews = useCarReviews(car.id)
  const hasRating = !!car.ratingAvg && car.ratingAvg > 0

  const specs: [string, string][] = [
    ['Коробка', TRANSMISSION_LABEL[car.transmission]],
    ['Топливо', FUEL_LABEL[car.fuelType]],
    ['Места', formatSeats(car.seats)],
    ['Пробег', formatMileage(car.mileageKm)],
    ['Кузов', car.bodyType],
    ['Год', String(car.year)],
  ]

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
        <div className="min-w-0 space-y-6">
          <Gallery car={car} />

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-fg">
                {car.make} {car.model}
              </h1>
              <span className="text-muted">{car.year}</span>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-sm text-muted">
              {hasRating ? (
                <span className="inline-flex items-center gap-0.5 text-fg">
                  <Star className="size-3.5 fill-current" aria-hidden />
                  {formatRating(car.ratingAvg!)}
                </span>
              ) : (
                <span>Пока нет оценок</span>
              )}
              {reviews.data && reviews.data.ratingsCount > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>{reviewsCountLabel(reviews.data.ratingsCount)}</span>
                </>
              )}
              <span aria-hidden>·</span>
              <span>{car.address}</span>
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {specs.map(([term, value]) => (
              <div key={term} className="rounded-2xl border border-line bg-surface px-3.5 py-2.5">
                <dt className="text-xs text-muted">{term}</dt>
                <dd className="font-medium text-fg">{value}</dd>
              </div>
            ))}
          </dl>

          {car.description?.trim() && <p className="whitespace-pre-line leading-relaxed text-fg">{car.description}</p>}

          <section aria-labelledby="where-title">
            <h2 id="where-title" className="text-lg font-bold text-fg">
              Где машина
            </h2>
            <p className="mt-1 text-sm text-muted">{car.address}</p>
            {car.latitude !== null && car.longitude !== null ? (
              <div className="mt-3">
                <Suspense fallback={<Skeleton className="h-56 w-full rounded-2xl" />}>
                  <CarMiniMap latitude={car.latitude} longitude={car.longitude} price={car.pricePerHour} />
                </Suspense>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted">Точка на карте для этой машины не указана.</p>
            )}
          </section>

          <CarReviews carId={car.id} />
        </div>

        <aside className="hidden lg:sticky lg:top-[72px] lg:block">
          <BookingCard car={car} cta={cta} />
        </aside>
      </div>

      <MobileBookBar car={car} cta={cta} />
    </Shell>
  )
}

/** Общая обёртка страницы: ширина, отступы и ссылка «Назад». */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-8 pt-4">
      <BackLink />
      <div className="mt-3">{children}</div>
    </div>
  )
}

/** «Назад» возвращает в каталог с теми же фильтрами и прокруткой, если пришли из него; иначе ведёт в каталог. */
function BackLink() {
  const navigate = useNavigate()
  const cameFromApp = ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0
  const className = 'inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg'
  return cameFromApp ? (
    <button type="button" onClick={() => navigate(-1)} className={className}>
      <ArrowLeft className="size-4" aria-hidden /> Назад
    </button>
  ) : (
    <Link to="/cars" className={className}>
      <ArrowLeft className="size-4" aria-hidden /> Каталог
    </Link>
  )
}

function PageSkeleton() {
  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]" aria-hidden>
        <div className="space-y-4">
          <Skeleton className="aspect-[16/10] w-full rounded-3xl" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-24 w-full" />
        </div>
        <Skeleton className="hidden h-56 w-full rounded-3xl lg:block" />
      </div>
    </Shell>
  )
}
