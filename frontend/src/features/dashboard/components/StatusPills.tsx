import { Link } from 'react-router'
import { plural } from '@/features/cars/format'
import { formatLeft } from '../logic'
import type { PddSummary } from '../types'

const pill = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-surface-2'

interface Props {
  discount: PddSummary['activeDiscount']
  /** Предлагать пройти тест: скидки нет, а попытки в цикле остались */
  invite: boolean
  unread: number
  /** Поездки, по которым ещё нужно оставить оценку (без повторов) */
  ratingBookings: string[]
  now: Date
}

/** Ряд плашек: скидка ПДД, непрочитанные уведомления, поездки без оценки. Если показывать нечего, ряда нет. */
export function StatusPills({ discount, invite, unread, ratingBookings, now }: Props) {
  const left = discount ? new Date(discount.expiresAt).getTime() - now.getTime() : 0
  const hasDiscount = !!discount && left > 0
  if (!hasDiscount && !invite && unread <= 0 && ratingBookings.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {hasDiscount && discount && (
        <Link to="/app/pdd" className={`${pill} border-primary font-semibold text-fg`}>
          −{discount.percent}% на аренду <span className="font-normal text-muted">ещё {formatLeft(left)}</span>
        </Link>
      )}
      {!hasDiscount && invite && (
        <Link to="/app/pdd" className={`${pill} border-line bg-surface text-fg`}>
          Пройдите тест ПДД и получите скидку
        </Link>
      )}
      {unread > 0 && (
        <Link to="/app/notifications" className={`${pill} border-line bg-surface text-fg`}>
          <span aria-hidden className="size-1.5 rounded-full bg-danger" />
          {unread} {plural(unread, ['уведомление', 'уведомления', 'уведомлений'])}
        </Link>
      )}
      {ratingBookings.length > 0 && (
        <Link to={`/app/bookings/${ratingBookings[0]}`} className={`${pill} border-line bg-surface text-fg`}>
          {ratingBookings.length} {plural(ratingBookings.length, ['поездка ждёт', 'поездки ждут', 'поездок ждут'])} оценки
        </Link>
      )}
    </div>
  )
}
