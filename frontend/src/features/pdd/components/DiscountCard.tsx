import { BadgePercent } from 'lucide-react'
import { Link } from 'react-router'
import { useNow } from '@/features/bookings/useNow'
import { formatDateTime } from '@/shared/lib/format'
import { formatLeft, remainingMs } from '../logic'
import type { PddDiscount } from '../types'

/**
 * Активная скидка за тест (GET /pddtest/attempts → activeDiscount) с обратным отсчётом.
 * По документу она применяется автоматически к ближайшей брони при завершении поездки.
 */
export function DiscountCard({ discount }: { discount: PddDiscount }) {
  const now = useNow(30_000)
  const left = remainingMs(discount.expiresAt, now)
  if (left <= 0) return null
  return (
    <section aria-label="Скидка за тест" className="rounded-3xl border border-line bg-accent p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <BadgePercent className="mt-0.5 size-6 shrink-0 text-accent-fg" aria-hidden />
        <div>
          <h2 className="font-bold text-accent-fg">Скидка {discount.percent}% на аренду</h2>
          <p className="mt-1 text-sm text-accent-fg">
            Осталось: <span className="font-semibold">{formatLeft(left)}</span> (до {formatDateTime(discount.expiresAt)}). Применится автоматически к ближайшей брони при завершении поездки.
          </p>
          <Link to="/cars" className="mt-3 inline-block text-sm font-medium text-accent-fg underline hover:opacity-80">
            Выбрать машину
          </Link>
        </div>
      </div>
    </section>
  )
}
