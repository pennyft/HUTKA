import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError, errorMessage } from '@/api/errors'
import { PhotoGrid } from '@/features/bookings/components/PhotoGrid'
import { formatPeriod } from '@/features/bookings/period'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'
import { Skeleton } from '@/shared/ui/Skeleton'
import { BOOKING_STATUS_LABEL } from '../bookings/logic'
import type { DisputeDecision } from '../bookings/types'
import { Pill } from '../components/Pills'
import { useAdminDispute, useResolveDispute } from '../disputes/hooks'
import { buildResolveBody, DECISION_LABEL, disputeEventLabel, resolveProblem } from '../disputes/logic'

function Row({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex justify-between gap-4 py-1.5 text-sm">
            <dt className="shrink-0 text-muted">{label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-fg">{value}</dd>
        </div>
    )
}

/**
 * AD11. Спор: стороны, машина, фото до и после, цены и хронология. Администратор выбирает, в чью пользу решение, и указывает признанную
 * сумму ущерба (при решении в пользу партнёра сумма обязательна, 0,00 допустимо). Решение необратимо, поэтому перед отправкой
 * показывается подтверждение. После решения машина возвращается в оборот при любом исходе, обе стороны получают dispute_resolved,
 * статус брони не меняется. POST /admin/disputes/{id}/resolve.
 */
export default function AdminDisputePage() {
    const { disputeId = '' } = useParams()
    const { data: d, isPending, isError, error, refetch } = useAdminDispute(disputeId)
    const resolve = useResolveDispute(disputeId)
    const [decision, setDecision] = useState<DisputeDecision | ''>('')
    const [amount, setAmount] = useState('')
    const [problem, setProblem] = useState<string | null>(null)
    const [confirming, setConfirming] = useState(false)

    if (isPending) return <div className="mx-auto max-w-4xl space-y-3 px-4 pt-6"><Skeleton className="h-10 w-1/2" aria-hidden /><Skeleton className="h-80 rounded-3xl" aria-hidden /></div>
    if (isError) {
        const notFound = error instanceof ApiError && error.status === 404
        return (
            <div className="mx-auto max-w-4xl px-4 pb-10 pt-6">
                <div className="rounded-3xl border border-line bg-surface p-8">
                    <h1 className="text-lg font-bold text-fg">{notFound ? 'Спор не найден' : 'Не удалось загрузить спор'}</h1>
                    <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                    <div className="mt-5 flex gap-3">
                        {!notFound && (
                            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        )}
                        <Link to="/admin/disputes" className="inline-block rounded-xl border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-fg hover:bg-surface-2">
                            Все споры
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const open = d.status === 'open'

    function review() {
        const p = resolveProblem(decision, amount)
        setProblem(p)
        if (!p) setConfirming(true)
    }

    return (
        <div className="mx-auto max-w-4xl space-y-5 px-4 pb-10 pt-6">
            <div>
                <Link to="/admin/disputes" className="text-sm text-muted underline hover:opacity-80">
                    Все споры
                </Link>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">
                    Спор: {d.car.make} {d.car.model}
                </h1>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <Pill warn={open}>{open ? 'Открыт' : 'Решён'}</Pill>
                    <span>открыт {formatDateTime(d.createdAt)}</span>
                    <Link to={`/admin/bookings/${d.booking.id}`} className="underline hover:text-fg">
                        бронь
                    </Link>
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                <section className="rounded-3xl border border-line bg-surface p-5">
                    <h2 className="mb-1 font-bold text-fg">Стороны и машина</h2>
                    <dl className="divide-y divide-line">
                        <Row label="Арендатор" value={<Link to={`/admin/users/${d.renter.id}`} className="underline hover:opacity-80">{d.renter.name ?? 'профиль'}</Link>} />
                        <Row label="Контакты" value={[d.renter.email, d.renter.phone].filter(Boolean).join(', ') || '—'} />
                        <Row label="Партнёр" value={<Link to={`/admin/users/${d.partner.id}`} className="underline hover:opacity-80">{d.partner.name ?? 'профиль'}</Link>} />
                        <Row label="Контакты" value={[d.partner.email, d.partner.phone].filter(Boolean).join(', ') || '—'} />
                        <Row label="Машина" value={<Link to={`/admin/cars/${d.car.id}`} className="underline hover:opacity-80">{d.car.plateNumber}</Link>} />
                    </dl>
                </section>
                <section className="rounded-3xl border border-line bg-surface p-5">
                    <h2 className="mb-1 font-bold text-fg">Поездка</h2>
                    <dl className="divide-y divide-line">
                        <Row label="Статус брони" value={BOOKING_STATUS_LABEL[d.booking.status]} />
                        <Row label="План" value={formatPeriod(d.booking.plannedStartAt, d.booking.plannedEndAt)} />
                        {d.booking.actualStartAt && <Row label="Фактически" value={d.booking.actualEndAt ? formatPeriod(d.booking.actualStartAt, d.booking.actualEndAt) : `с ${formatDateTime(d.booking.actualStartAt)}`} />}
                        {d.booking.overdueHours !== null && <Row label="Просрочка" value={`${d.booking.overdueHours} ч`} />}
                        <Row label="Цена за час" value={d.booking.pricePerHour !== null ? formatMoney(d.booking.pricePerHour) : '—'} />
                        <Row label="Расчёт" value={d.booking.priceEstimate !== null ? formatMoney(d.booking.priceEstimate) : '—'} />
                        <Row label="Итог" value={d.booking.finalPrice !== null ? formatMoney(d.booking.finalPrice) : '—'} />
                    </dl>
                </section>
            </div>

            {(d.booking.photosBefore.length > 0 || d.booking.photosAfter.length > 0) && (
                <section className="space-y-4 rounded-3xl border border-line bg-surface p-5">
                    <PhotoGrid title="Фото до поездки" urls={d.booking.photosBefore} />
                    <PhotoGrid title="Фото после поездки" urls={d.booking.photosAfter} />
                </section>
            )}

            <section aria-labelledby="dispute-timeline" className="rounded-3xl border border-line bg-surface p-5">
                <h2 id="dispute-timeline" className="mb-2 font-bold text-fg">
                    Хронология
                </h2>
                <ol className="space-y-2">
                    {[...d.timeline].sort((a, b) => a.at.localeCompare(b.at)).map((e, i) => (
                        <li key={`${e.event}-${i}`} className="flex justify-between gap-3 text-sm">
                            <span className="text-fg">{disputeEventLabel(e.event)}</span>
                            <span className="shrink-0 text-xs text-muted">{formatDateTime(e.at)}</span>
                        </li>
                    ))}
                </ol>
            </section>

            <section className="rounded-3xl border border-line bg-surface p-5">
                <h2 className="mb-2 font-bold text-fg">{open ? 'Решение' : 'Решение принято'}</h2>
                {!open ? (
                    <dl className="divide-y divide-line">
                        <Row label="В чью пользу" value={d.decision ? DECISION_LABEL[d.decision] : '—'} />
                        <Row label="Признанный ущерб" value={d.decision === 'partner_favor' && d.damageAmount !== null ? formatMoney(d.damageAmount) : 'не признан'} />
                        <Row label="Когда" value={d.resolvedAt ? formatDateTime(d.resolvedAt) : '—'} />
                    </dl>
                ) : confirming && decision ? (
                    <div className="rounded-2xl border border-line bg-surface-2 p-3">
                        <p className="text-sm text-fg">
                            Принять решение <span className="font-semibold">{DECISION_LABEL[decision].toLowerCase()}</span>
                            {decision === 'partner_favor' && <>, признанный ущерб {formatMoney(Number(amount.replace(',', '.')))}</>}? Решение нельзя изменить. Обе стороны получат уведомление, машина вернётся в оборот.
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-3">
                            <Button variant="dark" loading={resolve.isPending} onClick={() => resolve.mutate(buildResolveBody(decision, amount), { onError: () => setConfirming(false) })}>
                                Принять решение
                            </Button>
                            <Button variant="outline" disabled={resolve.isPending} onClick={() => setConfirming(false)}>
                                Назад
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <fieldset>
                            <legend className="mb-1.5 text-xs font-medium text-fg">В чью пользу решение</legend>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {(['renter_favor', 'partner_favor'] as const).map((v) => (
                                    <label key={v} className="block cursor-pointer">
                                        <input type="radio" name="decision" value={v} checked={decision === v} onChange={() => { setDecision(v); setProblem(null) }} className="peer sr-only" />
                                        <span className="block rounded-2xl border border-line bg-surface p-3 text-sm font-semibold transition-colors hover:bg-surface-2 peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-fg peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                      {DECISION_LABEL[v]}
                    </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                        {decision === 'partner_favor' && (
                            <TextField label="Признанный ущерб, BYN" inputMode="decimal" value={amount} onChange={(e) => { setAmount(e.target.value); setProblem(null) }} hint="0,00 допустимо; не больше двух знаков после запятой" />
                        )}
                        {problem && <p role="alert" className="rounded-xl border border-danger/40 bg-surface-2 p-3 text-sm text-fg">{problem}</p>}
                        {resolve.isError && <p role="alert" className="rounded-xl border border-danger/40 bg-surface-2 p-3 text-sm text-fg">{errorMessage(resolve.error)}</p>}
                        <Button variant="dark" onClick={review} className="sm:w-auto">
                            Принять решение
                        </Button>
                    </div>
                )}
            </section>
        </div>
    )
}