import { useState } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '@/api/errors'
import { BarChart } from '@/features/partner/components/BarChart'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useDashboard } from '../hooks'
import { dayBars, describeActivity, PERIODS, queueTiles, statusRows } from '../logic'

function Tile({ label, value, to, note }: { label: string; value: string | number; to?: string; note?: string }) {
    const body = (
        <>
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-bold text-fg">{value}</p>
            {note && <p className="mt-0.5 text-xs font-medium text-danger">{note}</p>}
        </>
    )
    const cls = 'block rounded-3xl border border-line bg-surface p-4'
    return to ? (
        <Link to={to} className={`${cls} transition-colors hover:bg-surface-2`}>
            {body}
        </Link>
    ) : (
        <div className={cls}>{body}</div>
    )
}

/**
 * AD2. Дашборд: метрики платформы за период (7, 30 или 90 дней), очереди (плитки ведут к экранам AD5, AD6, AD10, AD16), графики по дням
 * и лента последних событий. GET /admin/dashboard?days=. Лента собирается из событий создания (регистрация, заявка на машину, бронь, спор,
 * обращение): журнала действий администраторов в системе нет.
 */
export default function AdminDashboardPage() {
    const [days, setDays] = useState<number>(30)
    const { data, isPending, isError, error, refetch } = useDashboard(days)

    return (
        <div className="mx-auto max-w-6xl space-y-5 px-4 pb-10 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-fg">Дашборд</h1>
                    {data && <p className="mt-1 text-sm text-muted">Обновлено {formatDateTime(data.generatedAt)}</p>}
                </div>
                <div role="group" aria-label="Период" className="flex gap-2">
                    {PERIODS.map((p) => (
                        <button
                            key={p}
                            type="button"
                            aria-pressed={days === p}
                            onClick={() => setDays(p)}
                            className={`h-9 rounded-full border px-3.5 text-sm transition-colors ${days === p ? 'border-primary bg-accent font-medium text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
                        >
                            {p} дн.
                        </button>
                    ))}
                </div>
            </div>

            {isPending ? (
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
                    {Array.from({ length: 8 }, (_, i) => (
                        <Skeleton key={i} className="h-24 rounded-3xl" />
                    ))}
                </div>
            ) : isError ? (
                <div className="rounded-3xl border border-line bg-surface p-8">
                    <h2 className="text-lg font-bold text-fg">Не удалось загрузить дашборд</h2>
                    <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                    <div className="mt-5">
                        <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                            Повторить
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    <section aria-label="Очереди" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        {queueTiles(data.queues).map((t) => (
                            <Tile key={t.key} label={t.label} value={t.count} to={t.to} note={t.note} />
                        ))}
                    </section>

                    <section aria-label="Пользователи и машины" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Tile label="Пользователей" value={data.users.total} to="/admin/users" />
                        <Tile label="С подтверждённым ВУ" value={data.users.verified} to="/admin/users?status=verified" />
                        <Tile label="Партнёров" value={data.users.partners} to="/admin/users?partner=yes" />
                        <Tile label="Заблокировано" value={data.users.blocked} to="/admin/users?blocked=yes" />
                        <Tile label={`Новых за ${data.days} дн.`} value={data.users.newInPeriod} />
                        <Tile label={`Активных арендаторов за ${data.days} дн.`} value={data.users.activeRenters} />
                        <Tile label="Машин в каталоге" value={`${data.cars.visible} из ${data.cars.approved}`} to="/admin/cars" />
                        <Tile label="Скрыто" value={data.cars.hidden} />
                    </section>

                    <section aria-label="Брони и финансы" className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-3xl border border-line bg-surface p-4">
                            <h2 className="text-sm font-semibold text-fg">Брони</h2>
                            <p className="mt-1 text-2xl font-bold text-fg">{data.bookings.total}</p>
                            <p className="text-xs text-muted">создано за {data.days} дн.: {data.bookings.createdInPeriod}</p>
                            <ul className="mt-3 space-y-1 text-sm">
                                {statusRows(data.bookings.byStatus).map((r) => (
                                    <li key={r.status} className="flex justify-between gap-3">
                                        <span className="text-muted">{r.label}</span>
                                        <span className="font-medium text-fg">{r.count}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="rounded-3xl border border-line bg-surface p-4">
                            <h2 className="text-sm font-semibold text-fg">Финансы за {data.days} дн.</h2>
                            <dl className="mt-3 space-y-2 text-sm">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Списано с арендаторов</dt>
                                    <dd className="font-semibold text-fg">{formatMoney(data.finance.totalCharged, data.currency)}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Комиссия платформы</dt>
                                    <dd className="font-semibold text-fg">{formatMoney(data.finance.platformCommission, data.currency)}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Заработок партнёров</dt>
                                    <dd className="font-semibold text-fg">{formatMoney(data.finance.partnerEarnings, data.currency)}</dd>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <dt className="text-muted">Платежей</dt>
                                    <dd className="font-semibold text-fg">{data.finance.paymentsCount}</dd>
                                </div>
                            </dl>
                            <Link to="/admin/finance" className="mt-3 inline-block text-sm text-muted underline hover:text-fg">
                                Подробнее
                            </Link>
                        </div>
                    </section>

                    <section aria-label="Графики" className="grid gap-3 lg:grid-cols-3">
                        <BarChart title="Регистрации по дням" bars={dayBars(data.registrationsByDay)} format={(v) => String(v)} />
                        <BarChart title="Брони по дням" bars={dayBars(data.bookingsByDay)} format={(v) => String(v)} />
                        <BarChart title="Комиссия по дням" bars={dayBars(data.commissionByDay)} format={(v) => formatMoney(v, data.currency)} />
                    </section>

                    <section aria-labelledby="activity-title">
                        <h2 id="activity-title" className="mb-2 text-lg font-bold text-fg">
                            Последние события
                        </h2>
                        {data.recentActivity.length === 0 ? (
                            <p className="rounded-3xl border border-line bg-surface p-6 text-sm text-muted">Событий пока нет.</p>
                        ) : (
                            <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                                {data.recentActivity.map((a, i) => {
                                    const d = describeActivity(a)
                                    const row = (
                                        <>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-fg">{d.title}</span>
                        <span className="block truncate text-xs text-muted">{a.label}</span>
                      </span>
                                            <span className="shrink-0 text-xs text-muted">{formatDateTime(a.at)}</span>
                                        </>
                                    )
                                    return (
                                        <li key={`${a.type}-${a.entityId}-${i}`}>
                                            {d.to ? (
                                                <Link to={d.to} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                                                    {row}
                                                </Link>
                                            ) : (
                                                <div className="flex items-center justify-between gap-3 px-4 py-3">{row}</div>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
                    </section>
                </>
            )}
        </div>
    )
}