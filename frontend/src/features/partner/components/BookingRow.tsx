import { useState } from 'react'
import { Link } from 'react-router'
import { Star } from 'lucide-react'
import { BookingStatusBadge } from '@/features/bookings/components/BookingStatusBadge'
import { formatPeriod } from '@/features/bookings/period'
import { formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { awaitingResponse, DECLINE_REASON_MAX, leftText, reasonProblem, responseMsLeft } from '../bookingsLogic'
import { useBookingDecision, useRenterRating } from '../hooks'
import type { PartnerBooking } from '../types'

/** Рейтинг арендатора под заявкой: «★ 4,8 · 12 оценок», пока грузится или нет оценок, ничего. */
function RenterRating({ userId, name }: { userId: string; name?: string | null }) {
  const { data } = useRenterRating(userId)
  const rated = data && data.averageRating !== null && data.ratingsCount > 0
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 text-xs text-muted">
      {name && <span className="font-medium text-fg">{name}</span>}
      {rated ? (
        <span className="inline-flex items-center gap-1">
          <Star className="size-3.5" aria-hidden />
          {data.averageRating!.toFixed(1).replace('.', ',')} · оценок: {data.ratingsCount}
        </span>
      ) : (
        <span>без оценок</span>
      )}
    </span>
  )
}

interface Props {
  booking: PartnerBooking
  carName: string
  now: Date
}

/**
 * Бронь в списке партнёра. Для заявки Request to Book: обратный отсчёт 6 часов от создания и кнопки «Одобрить» и «Отклонить»
 * (причина обязательна, до 255 символов). Имя арендатора (без фамилии) бэк кладёт в renterName списка; рядом его рейтинг.
 * Решение гонится с таймером: 409 «Заявка уже обработана» или «Время ответа истекло» приходит текстом бэка, список после этого обновляется.
 */
export function BookingRow({ booking: b, carName, now }: Props) {
  const { approve, decline } = useBookingDecision()
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState<string | null>(null)
  const waiting = awaitingResponse(b)
  const left = waiting ? responseMsLeft(b, now) : 0
  const price = b.finalPrice ?? b.priceEstimate

  function submitDecline() {
    const problem = reasonProblem(reason)
    setReasonError(problem)
    if (problem) return
    decline.mutate({ id: b.id, reason: reason.trim() }, { onSuccess: () => setDeclining(false) })
  }

  return (
    <li className="rounded-3xl border border-line bg-surface p-4">
      <Link to={`/partner/bookings/${b.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-fg">{carName}</p>
            <p className="text-sm text-muted">{formatPeriod(b.plannedStartAt, b.plannedEndAt)}</p>
          </div>
          <BookingStatusBadge booking={b} />
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <RenterRating userId={b.renterId} name={b.renterName} />
          {price !== null && price !== undefined && <span className="text-sm font-semibold text-fg">{formatMoney(price)}</span>}
        </div>
      </Link>

      {waiting && (
        <div className="mt-3 border-t border-line pt-3">
          <p className={`text-sm ${left > 0 ? 'text-fg' : 'text-danger'}`}>{left > 0 ? `Ответьте в течение ${leftText(left)}` : 'Время ответа истекло, заявка будет отклонена автоматически.'}</p>
          {declining ? (
            <div className="mt-2">
              <label htmlFor={`decline-${b.id}`} className="mb-1 block text-xs font-medium text-fg">
                Причина отказа
              </label>
              <textarea
                id={`decline-${b.id}`}
                value={reason}
                rows={2}
                maxLength={DECLINE_REASON_MAX}
                onChange={(e) => setReason(e.target.value)}
                className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {reasonError && <p className="mt-1 text-xs text-danger">{reasonError}</p>}
              <div className="mt-2 grid grid-cols-2 gap-3">
                <Button variant="dark" loading={decline.isPending} onClick={submitDecline}>
                  Отклонить
                </Button>
                <Button variant="outline" disabled={decline.isPending} onClick={() => setDeclining(false)}>
                  Назад
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Button variant="dark" loading={approve.isPending} disabled={left <= 0} onClick={() => approve.mutate(b.id)}>
                Одобрить
              </Button>
              <Button variant="outline" disabled={approve.isPending} onClick={() => setDeclining(true)}>
                Отклонить
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
