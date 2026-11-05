import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { formatMoment } from '@/features/bookings/period'

const row = 'flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3'

/** Строка «Оцените поездку»: первая из поездок, по которым ещё нет оценки. */
export function RateRow({ bookingId, carName, finishedAt }: { bookingId: string; carName: string | null; finishedAt: string }) {
  return (
    <div className={row}>
      <p className="min-w-0 flex-1 text-fg">
        <span className="font-semibold">Оцените поездку{carName ? ` на ${carName}` : ''}</span>
        <span className="text-muted"> · завершена {formatMoment(finishedAt)}</span>
      </p>
      <Link to={`/app/bookings/${bookingId}`} className="font-semibold text-fg underline hover:opacity-80">
        Оценить
      </Link>
    </div>
  )
}

/** Приглашение стать партнёром: для подтверждённого пользователя, у которого ещё нет одобренной машины. */
export function PartnerRow() {
  return (
    <div className={row}>
      <p className="min-w-0 flex-1 text-muted">Сдавайте свою машину и зарабатывайте, пока она стоит.</p>
      <Link to="/app/become-partner" className="font-semibold text-fg underline hover:opacity-80">
        Стать партнёром
      </Link>
    </div>
  )
}

/** Контейнер для нижних строк: между ними отступ, а если строк нет, в разметке ничего не остаётся. */
export function FooterRows({ children }: { children: ReactNode }) {
  return <div className="space-y-3 empty:hidden">{children}</div>
}
