import { Link } from 'react-router'
import { CarPhoto } from '@/features/cars/components/CarPhoto'
import type { CarLookup } from '@/features/bookings/hooks'
import { bookingStatusLabel } from '@/features/bookings/status'
import type { Booking } from '@/features/bookings/types'
import { clockRange, dayWeatherLine, forecastFor } from '../logic'
import type { DayForecast } from '../types'

const dayNumber = (iso: string) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric' }).format(new Date(iso))
const dayShort = (iso: string) => new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(new Date(iso))

interface Props {
  trips: Booking[]
  cars: Record<string, CarLookup>
  /** undefined: прогноз не загрузился, подписи без погоды */
  days: DayForecast[] | undefined
}

/**
 * Ближайшие поездки с календарным блоком даты и миниатюрой машины. Погода по дню поездки берётся из общего
 * прогноза (он покрывает 7 дней), для более далёких поездок честно пишем, что прогноз появится позже.
 */
export function UpcomingTrips({ trips, cars, days }: Props) {
  if (trips.length === 0) return null
  return (
    <section aria-labelledby="upcoming-title">
      <div className="flex items-baseline justify-between">
        <h2 id="upcoming-title" className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted">
          Ближайшие поездки
        </h2>
        <Link to="/app/bookings" className="text-sm text-muted underline hover:text-fg">
          Все поездки
        </Link>
      </div>
      <ul className="mt-2">
        {trips.map((b) => {
          const lookup = cars[b.carId]
          const name = lookup?.car ? `${lookup.car.make} ${lookup.car.model}` : lookup?.missing ? 'Автомобиль недоступен' : '…'
          const day = days ? forecastFor(days, b.plannedStartAt) : undefined
          const weather = days ? (day ? dayWeatherLine(day) : 'прогноз появится ближе к дате') : ''
          const status = bookingStatusLabel(b)
          return (
            <li key={b.id}>
              <Link to={`/app/bookings/${b.id}`} className="grid grid-cols-[3rem_minmax(0,1fr)] items-center gap-3.5 border-t border-line py-3 transition-colors hover:bg-surface-2">
                <div className="text-center">
                  <p className="text-2xl font-bold leading-none text-fg">{dayNumber(b.plannedStartAt)}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{dayShort(b.plannedStartAt)}</p>
                </div>
                <div className="flex min-w-0 items-center gap-3">
                  <CarPhoto src={lookup?.car?.photos?.[0]} className="h-[42px] w-[58px] shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fg">{name}</p>
                    <p className="text-xs text-muted">{[clockRange(b.plannedStartAt, b.plannedEndAt), weather].filter(Boolean).join(' · ')}</p>
                    <span className="mt-1 inline-block rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-fg sm:hidden">{status}</span>
                  </div>
                  <span className="hidden shrink-0 rounded-full border border-line bg-surface px-2.5 py-0.5 text-[11px] text-fg sm:inline-block">{status}</span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
