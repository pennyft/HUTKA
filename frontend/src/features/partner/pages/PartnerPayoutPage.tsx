import { Link, useParams } from 'react-router'
import { ApiError, errorMessage } from '@/api/errors'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { usePayout } from '../hooks'
import { PAYOUT_STATUS_LABEL, periodText } from '../payoutsLogic'

/**
 * P10. Состав выплаты: какие аренды вошли, сумма по каждой и удержанная комиссия. GET /partner/payouts/{id}.
 * Комиссия берётся только с части «часы в пределах плана × цена»; часы просрочки идут партнёру целиком (по документу).
 */
export default function PartnerPayoutPage() {
    const { payoutId = '' } = useParams()
    const { data, isPending, isError, error, refetch } = usePayout(payoutId)

    if (isPending) return <div className="mx-auto max-w-2xl px-4 pt-6"><Skeleton className="h-64 rounded-3xl" aria-hidden /></div>
    if (isError) {
        const notFound = error instanceof ApiError && error.status === 404
        return (
            <div className="mx-auto max-w-2xl px-4 pb-10 pt-6">
                <div className="rounded-3xl border border-line bg-surface p-8">
                    <h1 className="text-lg font-bold text-fg">{notFound ? 'Выплата не найдена' : 'Не удалось загрузить выплату'}</h1>
                    <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                    <div className="mt-5 flex gap-3">
                        {!notFound && (
                            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        )}
                        <Link to="/partner/payouts" className="inline-block rounded-xl border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-fg hover:bg-surface-2">
                            Все выплаты
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const { payout: p, items } = data
    return (
        <div className="mx-auto max-w-2xl space-y-5 px-4 pb-10 pt-6">
            <div>
                <Link to="/partner/payouts" className="text-sm text-muted underline hover:opacity-80">
                    Все выплаты
                </Link>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">Выплата за {periodText(p.periodStart, p.periodEnd)}</h1>
                <p className="mt-1 text-sm text-muted">
                    {PAYOUT_STATUS_LABEL[p.status]}
                    {p.paidAt && <> · {formatDateTime(p.paidAt)}</>}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="rounded-3xl border border-line bg-surface p-4">
                    <p className="text-xs text-muted">Сумма выплаты</p>
                    <p className="mt-1 text-xl font-bold text-fg">{formatMoney(p.amount, p.currency)}</p>
                </div>
                <div className="rounded-3xl border border-line bg-surface p-4">
                    <p className="text-xs text-muted">Удержана комиссия</p>
                    <p className="mt-1 text-xl font-bold text-fg">{formatMoney(p.commissionDeducted, p.currency)}</p>
                </div>
            </div>

            <section aria-labelledby="payout-items">
                <h2 id="payout-items" className="mb-2 text-lg font-bold text-fg">
                    Аренды в выплате
                </h2>
                {items.length === 0 ? (
                    <p className="rounded-3xl border border-line bg-surface p-6 text-sm text-muted">В выплате нет аренд.</p>
                ) : (
                    <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                        {items.map((i) => (
                            <li key={i.bookingId}>
                                <Link to={`/partner/bookings/${i.bookingId}`} className="block px-4 py-3 transition-colors hover:bg-surface-2">
                                    <div className="flex items-baseline justify-between gap-3">
                                        <span className="text-sm text-muted">{formatDateTime(i.chargedAt)}</span>
                                        <span className="font-semibold text-fg">{formatMoney(i.partnerAmount, p.currency)}</span>
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted">
                                        Списано с арендатора {formatMoney(i.amount, p.currency)}, комиссия {formatMoney(i.commission, p.currency)}
                                    </p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
                <p className="mt-2 text-xs text-muted">Комиссия берётся только с части «часы в пределах плана × цена». Часы просрочки идут вам целиком.</p>
            </section>
        </div>
    )
}