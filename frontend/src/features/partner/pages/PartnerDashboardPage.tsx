import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { aiApi } from '@/features/ai/api'
import { useMe } from '@/features/auth/hooks'
import { WeatherStrip } from '@/features/dashboard/components/WeatherStrip'
import { useForecast } from '@/features/dashboard/hooks'
import { formatMoment } from '@/features/bookings/period'
import { useNow } from '@/features/bookings/useNow'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { BookingRow } from '../components/BookingRow'
import { monthKey, monthTitle } from '../analyticsLogic'
import { sortPartnerBookings } from '../bookingsLogic'
import { usePartnerAnalytics, usePartnerBookings, usePartnerCars, usePartnerIncome } from '../hooks'

const ADVICE_PROMPT = 'Дай три коротких практических совета, как увеличить доход от моих машин, опираясь на мою статистику.'

function Stat({ label, value, onClick, active }: { label: string; value: string; onClick?: () => void; active?: boolean }) {
    const body = (
        <>
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-xl font-bold text-fg">{value}</p>
        </>
    )
    const cls = `rounded-3xl border bg-surface p-4 text-left ${active ? 'border-primary' : 'border-line'}`
    return onClick ? (
        <button type="button" onClick={onClick} aria-expanded={active} className={`${cls} transition-colors hover:bg-surface-2`}>
            {body}
        </button>
    ) : (
        <div className={cls}>{body}</div>
    )
}

/**
 * P1. Дашборд партнёра: четыре метрики (доход за месяц раскрывается в список поездок, из которых он сложился), прогноз,
 * советы AI-помощника по запросу и ближайшие брони с быстрыми действиями. GET /partner/analytics, /partner/income, /partner/bookings?status=pending,
 * POST /ai/chat (cabinet=partner). Погода по точке по умолчанию: у машин партнёра в API нет координат.
 */
export default function PartnerDashboardPage() {
    const { data: me } = useMe()
    const now = useNow(30_000)
    const analytics = usePartnerAnalytics({ weeks: 1, months: 1, days: 30 })
    const cars = usePartnerCars()
    const bookings = usePartnerBookings({ status: 'pending' })
    const forecast = useForecast()
    const [incomeOpen, setIncomeOpen] = useState(false)
    const month = monthKey(now)
    const income = usePartnerIncome(month, incomeOpen)
    const names = useMemo(() => Object.fromEntries((cars.data ?? []).map((c) => [c.id, `${c.make} ${c.model}`])), [cars.data])
    const upcoming = useMemo(() => sortPartnerBookings(bookings.data ?? []).slice(0, 5), [bookings.data])

    const advice = useMutation({ mutationFn: () => aiApi.chat({ message: ADVICE_PROMPT, page: '/partner', cabinet: 'partner', history: [] }) })

    const s = analytics.data?.summary
    const currency = analytics.data?.currency ?? 'BYN'

    return (
        <div className="mx-auto max-w-4xl space-y-5 px-4 pb-10 pt-6">
            <header>
                <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">Кабинет партнёра{me ? `, ${me.firstName}` : ''}</h1>
                <p className="mt-1 text-sm text-muted">Доходы, заявки и состояние ваших машин.</p>
            </header>

            {forecast.data && forecast.data.length > 0 && <WeatherStrip days={forecast.data} now={now} />}

            {analytics.isPending ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-hidden>
                    {Array.from({ length: 4 }, (_, i) => (
                        <Skeleton key={i} className="h-20 rounded-3xl" />
                    ))}
                </div>
            ) : analytics.isError ? (
                <div className="rounded-3xl border border-line bg-surface p-6">
                    <p className="text-sm text-muted">{errorMessage(analytics.error)}</p>
                    <div className="mt-3">
                        <Button variant="outline" onClick={() => analytics.refetch()} className="sm:w-auto">
                            Повторить
                        </Button>
                    </div>
                </div>
            ) : (
                s && (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <Stat label="Доход за месяц" value={formatMoney(s.monthIncome, currency)} onClick={() => setIncomeOpen((o) => !o)} active={incomeOpen} />
                        <Stat label="Аренд за месяц" value={String(s.monthRentals)} />
                        <Stat label="Средний рейтинг" value={s.ratingAvg !== null ? s.ratingAvg.toFixed(1).replace('.', ',') : '—'} />
                        <Stat label="Ближайшая бронь" value={s.nextBooking ? formatMoment(s.nextBooking.plannedStartAt) : 'нет'} />
                    </div>
                )
            )}

            {incomeOpen && (
                <section aria-label="Из чего сложился доход" className="rounded-3xl border border-line bg-surface p-4">
                    <h2 className="font-bold text-fg">{monthTitle(month)}: поездки</h2>
                    {income.isPending ? (
                        <Skeleton className="mt-3 h-16" aria-hidden />
                    ) : income.isError ? (
                        <p className="mt-2 text-sm text-muted">{errorMessage(income.error)}</p>
                    ) : income.data.trips.length === 0 ? (
                        <p className="mt-2 text-sm text-muted">В этом месяце завершённых поездок пока нет.</p>
                    ) : (
                        <>
                            <ul className="mt-2 divide-y divide-line">
                                {income.data.trips.map((t) => (
                                    <li key={t.bookingId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                                        <Link to={`/partner/bookings/${t.bookingId}`} className="min-w-0 hover:underline">
                                            <span className="block truncate font-medium text-fg">{t.car}</span>
                                            <span className="text-xs text-muted">{formatDateTime(t.finishedAt)}</span>
                                        </Link>
                                        <span className="shrink-0 text-right">
                      <span className="block font-semibold text-fg">{formatMoney(t.partnerAmount, income.data.currency)}</span>
                      <span className="text-xs text-muted">комиссия {formatMoney(t.commissionAmount, income.data.currency)}</span>
                    </span>
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-2 text-xs text-muted">
                                Поездок: {income.data.tripsCount}, комиссия платформы {formatMoney(income.data.commissionTotal, income.data.currency)}.
                            </p>
                        </>
                    )}
                </section>
            )}

            <section aria-labelledby="advice-title" className="rounded-3xl border border-line bg-surface p-4">
                <h2 id="advice-title" className="font-bold text-fg">
                    Советы помощника
                </h2>
                {advice.data ? (
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-fg">{advice.data.reply}</p>
                ) : (
                    <p className="mt-1 text-sm text-muted">AI-помощник посмотрит вашу статистику и подскажет, как поднять доход. Ответ может быть неточным.</p>
                )}
                {advice.isError && <p className="mt-2 text-sm text-danger">{errorMessage(advice.error)}</p>}
                <div className="mt-3">
                    <Button variant="outline" loading={advice.isPending} onClick={() => advice.mutate()} className="sm:w-auto">
                        {advice.data ? 'Обновить советы' : 'Получить советы'}
                    </Button>
                </div>
            </section>

            <section aria-labelledby="upcoming-title">
                <div className="mb-2 flex items-baseline justify-between">
                    <h2 id="upcoming-title" className="text-lg font-bold text-fg">
                        Ближайшие брони
                    </h2>
                    <Link to="/partner/bookings" className="text-sm text-muted underline hover:text-fg">
                        Все брони
                    </Link>
                </div>
                {bookings.isPending ? (
                    <Skeleton className="h-24 rounded-3xl" aria-hidden />
                ) : bookings.isError ? (
                    <p className="text-sm text-muted">{errorMessage(bookings.error)}</p>
                ) : upcoming.length === 0 ? (
                    <p className="rounded-3xl border border-line bg-surface p-6 text-sm text-muted">Пока нет ожидающих броней.</p>
                ) : (
                    <ul className="space-y-3">
                        {upcoming.map((b) => (
                            <BookingRow key={b.id} booking={b} carName={names[b.carId] ?? 'Автомобиль'} now={now} />
                        ))}
                    </ul>
                )}
            </section>
        </div>
    )
}