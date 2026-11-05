import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { CarPhoto } from '@/features/cars/components/CarPhoto'
import { formatMoment } from '@/features/bookings/period'
import { bookingStatusLabel, overdueMs } from '@/features/bookings/status'
import type { CarLookup } from '@/features/bookings/hooks'
import { Skeleton } from '@/shared/ui/Skeleton'
import { formatLeft, type Hero } from '../logic'

const heroClass = 'grid grid-cols-1 overflow-hidden rounded-3xl bg-primary text-primary-fg'
const buttonClass = 'inline-block self-start rounded-xl bg-surface px-4 py-2.5 text-sm font-semibold text-fg transition-opacity hover:opacity-90'

/**
 * Главная тёмная карточка: идущая поездка или ближайшая. Справа фото машины (на телефоне сверху).
 * Для идущей поездки показываем, сколько осталось до планового возврата, а при просрочке сколько её набежало.
 */
export function TripHero({ hero, lookup, now }: { hero: Hero; lookup?: CarLookup; now: Date }) {
  const b = hero.booking
  const car = lookup?.car
  const title = car ? `${car.make} ${car.model}` : lookup?.missing ? 'Автомобиль недоступен' : null

  let label: string
  let line: string
  let chip: ReactNode
  if (hero.kind === 'active') {
    const over = overdueMs(b, now)
    label = 'Идёт поездка'
    line = `Верните до ${formatMoment(b.plannedEndAt)}`
    chip =
      over > 0 ? (
        <span className="text-[#FCA5A5]">просрочка {formatLeft(over)}</span>
      ) : (
        <>осталось {formatLeft(new Date(b.plannedEndAt).getTime() - now.getTime())}</>
      )
  } else {
    label = 'Ближайшая поездка'
    line = `Начало ${formatMoment(b.plannedStartAt)}`
    chip = bookingStatusLabel(b)
  }

  return (
    <section aria-label={label} className={`${heroClass} sm:grid-cols-[minmax(0,1fr)_13rem]`}>
      <div className="flex flex-col justify-between gap-4 p-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-primary-fg/65">{label}</p>
          {title ? <h2 className="mt-1 text-2xl font-bold tracking-tight">{title}</h2> : <Skeleton className="mt-2 h-7 w-40 bg-primary-fg/15" />}
          <p className="mt-0.5 text-primary-fg/80">{line}</p>
          <p className="mt-2 inline-block rounded-xl bg-primary-fg/15 px-2.5 py-1 text-xs">{chip}</p>
        </div>
        <Link to={`/app/bookings/${b.id}`} className={buttonClass}>
          Открыть поездку
        </Link>
      </div>
      <div className="order-first h-44 sm:order-last sm:h-auto sm:min-h-44">
        <CarPhoto src={car?.photos?.[0]} className="size-full" />
      </div>
    </section>
  )
}

/** Нет ни идущих, ни ожидающих броней. */
export function EmptyHero() {
  return (
    <section aria-label="Нет поездок" className={heroClass}>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Пока нет поездок</h2>
          <p className="mt-1 text-primary-fg/80">Выберите машину в каталоге и забронируйте на нужное время.</p>
        </div>
        <Link to="/cars" className={buttonClass}>
          Найти машину
        </Link>
      </div>
    </section>
  )
}

/** Вместо поездок для пользователя, у которого ВУ ещё не подтверждено: без этого бронь, тест ПДД и группы недоступны. */
export function LicenseHero({ status }: { status: 'unverified' | 'pending' }) {
  const pending = status === 'pending'
  return (
    <section aria-label="Верификация водительского удостоверения" className={heroClass}>
      <div className="flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{pending ? 'Заявка на проверке' : 'Подтвердите водительское удостоверение'}</h2>
          <p className="mt-1 text-primary-fg/80">
            {pending
              ? 'Мы сообщим о результате уведомлением. Пока можно смотреть каталог.'
              : 'Без этого нельзя бронировать машины, проходить тест ПДД и участвовать в групповых поездках.'}
          </p>
        </div>
        <Link to={pending ? '/cars' : '/app/license'} className={buttonClass}>
          {pending ? 'Смотреть каталог' : 'Подтвердить'}
        </Link>
      </div>
    </section>
  )
}
