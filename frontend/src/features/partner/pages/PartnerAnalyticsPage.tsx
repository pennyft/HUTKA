import { useState } from 'react'
import { errorMessage } from '@/api/errors'
import { SelectField } from '@/features/support/components/FormFields'
import { formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { BarChart } from '../components/BarChart'
import { hoursText, monthLabel, percentText, weekdayShort, weekLabel } from '../analyticsLogic'
import { usePartnerAnalytics } from '../hooks'

const WEEKS = [8, 12, 26]
const MONTHS = [3, 6, 12]
const DAYS = [7, 30, 90]

/**
 * P7. Аналитика: доход по неделям и месяцам, самые загруженные дни недели, средняя длительность аренды и загрузка машин.
 * GET /partner/analytics?weeks&months&days (бэк сам ограничивает значения: недель до 52, месяцев до 24, дней до 90).
 * Загрузка в процентах считается по часам, доступным по расписанию: у машины без доступных часов в окне процента нет.
 */
export default function PartnerAnalyticsPage() {
    const [weeks, setWeeks] = useState(12)
    const [months, setMonths] = useState(6)
    const [days, setDays] = useState(30)
    const { data, isPending, isError, error, refetch } = usePartnerAnalytics({ weeks, months, days })
    const money = (v: number) => formatMoney(v, data?.currency ?? 'BYN')

    return (
        <div className="mx-auto max-w-4xl space-y-5 px-4 pb-10 pt-6">
            <header>
                <h1 className="text-2xl font-bold tracking-tight text-fg">Аналитика</h1>
                <p className="mt-1 text-sm text-muted">Доход, загруженность и динамика по вашим машинам.</p>
            </header>

            <div className="grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-3">
                <SelectField label="Недели на графике" value={weeks} onChange={(e) => setWeeks(Number(e.target.value))}>
                    {WEEKS.map((n) => (
                        <option key={n} value={n}>
                            {n}
                        </option>
                    ))}
                </SelectField>
                <SelectField label="Месяцы на графике" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
                    {MONTHS.map((n) => (
                        <option key={n} value={n}>
                            {n}
                        </option>
                    ))}
                </SelectField>
                <SelectField label="Окно для дней и загрузки" value={days} onChange={(e) => setDays(Number(e.target.value))}>
                    {DAYS.map((n) => (
                        <option key={n} value={n}>
                            {n} дней
                        </option>
                    ))}
                </SelectField>
            </div>

            {isPending ? (
                <div className="space-y-3" aria-hidden>
                    <Skeleton className="h-56 rounded-3xl" />
                    <Skeleton className="h-56 rounded-3xl" />
                </div>
            ) : isError ? (
                <div className="rounded-3xl border border-line bg-surface p-8">
                    <h2 className="text-lg font-bold text-fg">Не удалось загрузить аналитику</h2>
                    <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                    <div className="mt-5">
                        <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                            Повторить
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2">
                        <BarChart title="Доход по неделям" bars={data.revenueByWeek.map((p) => ({ key: p.periodStart, label: weekLabel(p.periodStart), value: p.income }))} format={money} />
                        <BarChart title="Доход по месяцам" bars={data.revenueByMonth.map((p) => ({ key: p.periodStart, label: monthLabel(p.periodStart), value: p.income }))} format={money} />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <BarChart
                            title={`Поездки по дням недели за ${data.windowDays} дн.`}
                            bars={[...data.topWeekdays].sort((a, b) => a.isoDay - b.isoDay).map((d) => ({ key: String(d.isoDay), label: weekdayShort(d.isoDay), value: d.trips }))}
                            format={(v) => String(v)}
                        />
                        <section className="rounded-3xl border border-line bg-surface p-4">
                            <h2 className="text-sm font-semibold text-fg">Средняя длительность аренды</h2>
                            <p className="mt-2 text-3xl font-bold text-fg">{hoursText(data.averageRentalHours)}</p>
                            <p className="mt-1 text-xs text-muted">По завершённым поездкам за {data.windowDays} дн.</p>
                        </section>
                    </div>

                    <section className="rounded-3xl border border-line bg-surface p-4">
                        <h2 className="text-sm font-semibold text-fg">Загрузка машин за {data.windowDays} дн.</h2>
                        {data.carUtilization.length === 0 ? (
                            <p className="mt-3 text-sm text-muted">Нет одобренных машин.</p>
                        ) : (
                            <ul className="mt-3 space-y-3">
                                {data.carUtilization.map((c) => (
                                    <li key={c.carId}>
                                        <div className="flex items-baseline justify-between gap-3 text-sm">
                                            <span className="min-w-0 truncate font-medium text-fg">{c.car}</span>
                                            <span className="shrink-0 text-muted">{percentText(c.utilizationPercent)}</span>
                                        </div>
                                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${c.car}: загрузка ${percentText(c.utilizationPercent)}`}>
                                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Math.max(0, c.utilizationPercent ?? 0))}%` }} />
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted">
                                            Занято {hoursText(c.bookedHours)} из {hoursText(c.availableHours)} доступных
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}