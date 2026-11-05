import { Link, useNavigate } from 'react-router'
import { Button } from '@/shared/ui/Button'
import { STATUS_LABEL, formatTripDate, participantsText } from '../format'
import { useJoinTrip } from '../hooks'
import type { TripSummary } from '../types'

/**
 * Карточка поездки в списке. Вся карточка ссылка на страницу поездки; кнопка «Присоединиться» лежит рядом со ссылкой,
 * а не внутри неё (кнопка внутри ссылки недопустима). Присоединение не создаёт бронь: машину участник бронирует отдельно.
 */
export function TripCard({ trip }: { trip: TripSummary }) {
  const navigate = useNavigate()
  const join = useJoinTrip()
  const canJoin = trip.status === 'open' && !trip.joined && !trip.full

  return (
    <article className="rounded-3xl border border-line bg-surface p-4 sm:p-5">
      <Link to={`/app/group-trips/${trip.id}`} className="block rounded-2xl">
        <div className="flex flex-wrap items-center gap-1.5">
          {trip.joined && <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-fg">Вы участвуете</span>}
          {trip.status !== 'open' && <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-medium text-fg">{STATUS_LABEL[trip.status]}</span>}
          {trip.status === 'open' && trip.full && <span className="rounded-full border border-line px-2.5 py-0.5 text-[11px] font-medium text-fg">Мест нет</span>}
        </div>
        <h3 className="mt-2 line-clamp-2 text-lg font-bold leading-snug tracking-tight text-fg">{trip.route}</h3>
        <p className="mt-1 text-sm text-fg">{formatTripDate(trip.date)}</p>
        <p className="mt-0.5 text-sm text-muted">
          Организатор: {trip.organizerName} · Участников: {participantsText(trip.participantsCount, trip.maxParticipants)}
        </p>
      </Link>
      {canJoin && (
        <div className="mt-3 sm:max-w-[13rem]">
          <Button
            variant="dark"
            loading={join.isPending}
            onClick={() => join.mutate(trip.id, { onSuccess: () => navigate(`/app/group-trips/${trip.id}`) })}
          >
            Присоединиться
          </Button>
        </div>
      )}
    </article>
  )
}
