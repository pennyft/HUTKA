import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { ApiError, errorMessage } from '@/api/errors'
import { PhotoGrid } from '@/features/bookings/components/PhotoGrid'
import { formatPeriod } from '@/features/bookings/period'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useAdminBooking, useForceClose } from '../bookings/hooks'
import { BOOKING_STATUS_LABEL, forceCloseState, PAYMENT_STATUS_LABEL, timelineLabel } from '../bookings/logic'
import { Pill } from '../components/Pills'
import { DECISION_LABEL } from '../disputes/logic'

function Row({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex justify-between gap-4 py-1.5 text-sm">
            <dt className="shrink-0 text-muted">{label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-fg">{value}</dd>
        </div>
    )
}

/**
 * AD9. Бронь: стороны, машина, фото до и после, цены и просрочка, платёж, спор и хронология событий. «Принудительно закрыть» доступно
 * для идущей поездки, переданной в спор, у которого уже есть решение. Хронология собирается из временных меток самой брони: момент отмены
 * бэк не хранит (отмена видна только по статусу), переписки по брони в API нет.
 */
export default function AdminBookingPage() {
    const { bookingId = '' } = useParams()
    const { data: b, isPending, isError, error, refetch } = useAdminBooking(bookingId)
    const close = useForceClose()
    const [confirming, setConfirming] = useState(false)

    if (isPending) return <div className="mx-auto max-w-4xl space-y-3 px-4 pt-6"><Skeleton className="h-10 w-1/2" aria-hidden /><Skeleton className="h-80 rounded-3xl" aria-hidden /></div>
    if (isError) {
        const notFound = error instanceof ApiError && error.status === 404
        return (
            <div className="mx-auto max-w-4xl px-4 pb-10 pt-6">
                <div className="rounded-3xl border border-line bg-surface p-8">
                    <h1 className="text-lg font-bold text-fg">{notFound ? 'Бронь не найдена' : 'Не удалось загрузить бронь'}</h1>
                    <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                    <div className="mt-5 flex gap-3">
                        {!notFound && (
                            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        )}
                        <Link to="/admin/bookings" className="inline-block rounded-xl border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-fg hover:bg-surface-2">
                            Все брони
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const fc = forceCloseState(b)

    return (
        <div className="mx-auto max-w-4xl space-y-5 px-4 pb-10 pt-6">
            <div>
                <Link to="/admin/bookings" className="text-sm text-muted underline hover:opacity-80">
                    Все брони
                </Link>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">{b.car.name ?? 'Автомобиль'}</h1>
                <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
                    <Pill>{BOOKING_STATUS_LABEL[b.status]}</Pill>
                    {b.escalatedAt && <Pill warn>Передана в спор</Pill>}
                    <span>{formatPeriod(b.plannedStartAt, b.plannedEndAt)}</span>
                </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                <section className="rounded-3xl border border-line bg-surface p-5">
                    <h2 className="mb-1 font-bold text-fg">Стороны</h2>
                    <dl className="divide-y divide-line">
                        <Row label="Арендатор" value={<Link to={`/admin/users/${b.renter.id}`} className="underline hover:opacity-80">{b.renter.name ?? 'профиль'}</Link>} />
                        <Row label="Контакты арендатора" value={[b.renter.email, b.renter.phone].filter(Boolean).join(', ') || '—'} />
                        <Row label="Партнёр" value={<Link to={`/admin/users/${b.partner.id}`} className="underline hover:opacity-80">{b.partner.name ?? 'профиль'}</Link>} />
                        <Row label="Контакты партнёра" value={[b.partner.email, b.partner.phone].filter(Boolean).join(', ') || '—'} />
                        <Row label="Машина" value={<Link to={`/admin/cars/${b.car.id}`} className="underline hover:opacity-80">{b.car.plateNumber ?? 'карточка'}</Link>} />
                    </dl>
                </section>

                <section className="rounded-3xl border border-line bg-surface p-5">
                    <h2 className="mb-1 font-bold text-fg">Цена</h2>
                    <dl className="divide-y divide-line">
                        <Row label="За час" value={b.pricePerHour !== null ? formatMoney(b.pricePerHour) : '—'} />
                        <Row label="Расчёт при бронировании" value={b.priceEstimate !== null ? formatMoney(b.priceEstimate) : '—'} />
                        {b.overdueHours !== null && b.overdueHours > 0 && <Row label="Просрочка возврата" value={`${b.overdueHours} ч`} />}
                        {b.pddDiscountApplied && <Row label="Скидка за тест ПДД" value={b.discountAmount !== null ? `−${formatMoney(b.discountAmount)}` : 'применена'} />}
                        <Row label="Итог" value={b.finalPrice !== null ? formatMoney(b.finalPrice) : '—'} />
                        {b.actualStartAt && <Row label="Фактически" value={b.actualEndAt ? formatPeriod(b.actualStartAt, b.actualEndAt) : `с ${formatDateTime(b.actualStartAt)}`} />}
                    </dl>
                    {b.declineReason && <p className="mt-2 text-sm text-muted">Причина отказа или автоотмены: {b.declineReason}</p>}
                </section>
            </div>

            {(b.photosBefore.length > 0 || b.photosAfter.length > 0) && (
                <section className="space-y-4 rounded-3xl border border-line bg-surface p-5">
                    <PhotoGrid title="Фото до поездки" urls={b.photosBefore} />
                    <PhotoGrid title="Фото после поездки" urls={b.photosAfter} />
                </section>
            )}

            <div className="grid gap-5 md:grid-cols-2">
                <section className="rounded-3xl border border-line bg-surface p-5">
                    <h2 className="mb-1 font-bold text-fg">Платёж</h2>
                    {b.payment ? (
                        <dl className="divide-y divide-line">
                            <Row label="Статус" value={<Pill warn={b.payment.status === 'failed'}>{PAYMENT_STATUS_LABEL[b.payment.status]}</Pill>} />
                            <Row label="Сумма" value={b.payment.amount !== null ? formatMoney(b.payment.amount, b.payment.currency) : '—'} />
                            <Row label="Комиссия платформы" value={b.payment.commissionAmount !== null ? formatMoney(b.payment.commissionAmount, b.payment.currency) : '—'} />
                            <Row label="Партнёру" value={b.payment.partnerAmount !== null ? formatMoney(b.payment.partnerAmount, b.payment.currency) : '—'} />
                        </dl>
                    ) : (
                        <p className="text-sm text-muted">Платежа по этой брони пока нет.</p>
                    )}
                    <p className="mt-2 text-xs text-muted">{b.hasAgreement ? 'Договор сформирован' : 'Договора пока нет'}</p>
                </section>

                <section className="rounded-3xl border border-line bg-surface p-5">
                    <h2 className="mb-1 font-bold text-fg">Спор</h2>
                    {b.dispute ? (
                        <>
                            <dl className="divide-y divide-line">
                                <Row label="Статус" value={<Pill>{b.dispute.status === 'resolved' ? 'Решён' : 'Открыт'}</Pill>} />
                                <Row label="Открыт" value={formatDateTime(b.dispute.createdAt)} />
                                {b.dispute.decision && <Row label="Решение" value={DECISION_LABEL[b.dispute.decision]} />}
                                {b.dispute.decision && b.dispute.damageAmount !== null && <Row label="Признанный ущерб" value={formatMoney(b.dispute.damageAmount)} />}
                            </dl>
                            <Link to={`/admin/disputes/${b.dispute.id}`} className="mt-3 inline-block text-sm font-semibold text-fg underline hover:opacity-80">
                                Открыть спор
                            </Link>
                        </>
                    ) : (
                        <p className="text-sm text-muted">Спора по этой брони нет.</p>
                    )}
                </section>
            </div>

            <section aria-labelledby="timeline-title" className="rounded-3xl border border-line bg-surface p-5">
                <h2 id="timeline-title" className="mb-2 font-bold text-fg">
                    Хронология
                </h2>
                {b.timeline.length === 0 ? (
                    <p className="text-sm text-muted">Событий нет.</p>
                ) : (
                    <ol className="space-y-2">
                        {[...b.timeline].sort((a, c) => a.at.localeCompare(c.at)).map((e, i) => (
                            <li key={`${e.event}-${i}`} className="flex justify-between gap-3 text-sm">
                                <span className="text-fg">{timelineLabel(e.event)}</span>
                                <span className="shrink-0 text-xs text-muted">{formatDateTime(e.at)}</span>
                            </li>
                        ))}
                    </ol>
                )}
            </section>

            {b.status === 'active' && (
                <section className="rounded-3xl border border-line bg-surface p-5">
                    <h2 className="mb-1 font-bold text-fg">Принудительное закрытие</h2>
                    {fc.kind === 'blocked' ? (
                        <p className="text-sm text-muted">{fc.reason}</p>
                    ) : confirming ? (
                        <div className="rounded-2xl border border-line bg-surface-2 p-3">
                            <p className="text-sm text-fg">Закрыть поездку принудительно? Спор по ней уже решён, бронь завершится и запустится расчёт.</p>
                            <div className="mt-2 grid grid-cols-2 gap-3">
                                <Button variant="dark" loading={close.isPending} onClick={() => close.mutate(b.id, { onSuccess: () => setConfirming(false) })}>
                                    Закрыть
                                </Button>
                                <Button variant="outline" disabled={close.isPending} onClick={() => setConfirming(false)}>
                                    Отмена
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setConfirming(true)} className="sm:w-auto">
                            Принудительно закрыть
                        </Button>
                    )}
                </section>
            )}
        </div>
    )
}