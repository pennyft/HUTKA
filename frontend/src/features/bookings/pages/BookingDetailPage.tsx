import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileDown } from 'lucide-react'
import { ApiError, errorMessage } from '@/api/errors'
import { CarPhoto } from '@/features/cars/components/CarPhoto'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { toast } from '@/shared/ui/toast'
import { bookingsApi } from '../api'
import { BookingStatusBadge } from '../components/BookingStatusBadge'
import { PhaseInfo } from '../components/PhaseInfo'
import { PhotoGrid } from '../components/PhotoGrid'
import { TripActions } from '../trip/TripActions'
import { RatingForm } from '../components/RatingForm'
import { formatMoney } from '../format'
import { useBooking, useCarsById } from '../hooks'
import { formatMoment, formatPeriod } from '../period'
import { bookingPhase } from '../status'
import { formatDuration } from '../time'
import { durationMinutes } from '../pricing'
import type { Booking } from '../types'
import { useNow } from '../useNow'

const cardClass = 'rounded-3xl border border-line bg-surface p-5'

/**
 * B9 (+ договор B12 и оценка B13). Экран брони: этап и что дальше, время, стоимость, фото, договор, оценка.
 * Набор кнопок зависит от этапа: пока заявка ждёт партнёра или бронь подтверждена, её можно отменить;
 * начать и завершить поездку (B10, B11) делает TripActions: панель с загрузкой фото, в API уходят только ссылки.
 */
export default function BookingDetailPage() {
    const { bookingId = '' } = useParams()
    const { data: booking, isPending, isError, error, refetch } = useBooking(bookingId)

    if (isPending) {
        return (
            <Shell>
                <div className="mt-4 space-y-4" aria-hidden>
                    <Skeleton className="h-10 w-2/3" />
                    <Skeleton className="h-28 w-full rounded-3xl" />
                    <Skeleton className="h-40 w-full rounded-3xl" />
                </div>
            </Shell>
        )
    }
    if (isError) {
        const notFound = error instanceof ApiError && error.status === 404
        return (
            <Shell>
                <div className="mt-4 rounded-3xl border border-line bg-surface p-8">
                    <h1 className="text-lg font-bold text-fg">{notFound ? 'Бронирование не найдено' : 'Не удалось загрузить бронирование'}</h1>
                    <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                        <Link to="/app/bookings" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover">
                            Мои поездки
                        </Link>
                        {!notFound && (
                            <Button variant="outline" onClick={() => refetch()} className="w-auto">
                                Повторить
                            </Button>
                        )}
                    </div>
                </div>
            </Shell>
        )
    }
    return (
        <Shell>
            <Detail booking={booking} />
        </Shell>
    )
}

function Detail({ booking }: { booking: Booking }) {
    const now = useNow()
    const qc = useQueryClient()
    const lookup = useCarsById([booking.carId])[booking.carId]
    const car = lookup?.car
    const phase = bookingPhase(booking)
    const canCancel = phase === 'awaiting_partner' || phase === 'confirmed'
    const [confirming, setConfirming] = useState(false)
    const [actionError, setActionError] = useState<string | null>(null)
    const [downloading, setDownloading] = useState(false)

    const pending = useQuery({
        queryKey: ['ratings', 'pending'],
        queryFn: ({ signal }) => bookingsApi.pendingRatings(signal),
        enabled: booking.status === 'finished',
    })
    const toRate = (pending.data ?? []).filter((p) => p.bookingId === booking.id)

    const cancel = useMutation({
        mutationFn: () => bookingsApi.cancel(booking.id),
        onSuccess: (updated) => {
            qc.setQueryData(['bookings', 'detail', booking.id], updated)
            qc.invalidateQueries({ queryKey: ['bookings'] })
            qc.invalidateQueries({ queryKey: ['car'] })
            qc.invalidateQueries({ queryKey: ['cars'] })
            qc.invalidateQueries({ queryKey: ['nav'] })
            toast.success('Бронь отменена.')
            setConfirming(false)
        },
        onError: (e) => {
            setActionError(errorMessage(e))
            setConfirming(false)
        },
    })

    async function downloadAgreement() {
        setDownloading(true)
        try {
            const blob = await bookingsApi.agreement(booking.id)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `hutka-agreement-${booking.id}.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
            setTimeout(() => URL.revokeObjectURL(url), 10_000)
        } catch (e) {
            toast.error(errorMessage(e))
        } finally {
            setDownloading(false)
        }
    }

    const finished = booking.status === 'finished'
    const title = car ? `${car.make} ${car.model}` : lookup?.missing ? 'Автомобиль недоступен' : null

    return (
        <div className="mt-4 space-y-4">
            <div className="flex items-start justify-between gap-3">
                {title ? <h1 className="text-2xl font-bold tracking-tight text-fg">{title}</h1> : <Skeleton className="h-8 w-48" />}
                <BookingStatusBadge booking={booking} />
            </div>

            {car && (
                <Link to={`/cars/${car.id}`} className={`${cardClass} flex items-center gap-4 transition-colors hover:bg-surface-2`}>
                    <CarPhoto src={car.photos?.[0]} className="h-16 w-24 shrink-0 rounded-xl" />
                    <div className="min-w-0">
                        <p className="truncate font-medium text-fg">
                            {car.make} {car.model}, {car.year}
                        </p>
                        <p className="truncate text-sm text-muted">{car.address}</p>
                    </div>
                </Link>
            )}

            <section className={cardClass} aria-live="polite">
                <PhaseInfo booking={booking} now={now} />

                {actionError && (
                    <p role="alert" className="mt-3 rounded-xl border border-danger/40 bg-surface-2 p-3 text-sm text-fg">
                        {actionError}
                    </p>
                )}

                {phase !== 'finished' && phase !== 'cancelled' && (
                    <div className="mt-4 flex flex-wrap gap-3">
                        <TripActions booking={booking} phase={phase} now={now} onError={setActionError} />
                        {canCancel && !confirming && (
                            <Button
                                variant="outline"
                                className="sm:w-auto"
                                onClick={() => {
                                    setActionError(null)
                                    setConfirming(true)
                                }}
                            >
                                Отменить бронь
                            </Button>
                        )}
                    </div>
                )}

                {canCancel && confirming && (
                    <div className="mt-4 rounded-2xl border border-line bg-surface-2 p-4">
                        <p className="font-medium text-fg">Отменить бронь?</p>
                        <p className="mt-1 text-sm text-muted">Машина освободится, а вернуть бронь будет нельзя: придётся оформить новую.</p>
                        <div className="mt-3 flex flex-wrap gap-3">
                            <Button variant="dark" loading={cancel.isPending} onClick={() => cancel.mutate()} className="sm:w-auto">
                                Да, отменить
                            </Button>
                            <Button variant="outline" disabled={cancel.isPending} onClick={() => setConfirming(false)} className="sm:w-auto">
                                Не отменять
                            </Button>
                        </div>
                    </div>
                )}
            </section>

            <section className={cardClass}>
                <h2 className="text-base font-semibold text-fg">Время</h2>
                <dl className="mt-3 space-y-1.5 text-sm">
                    <Row term="По плану" value={formatPeriod(booking.plannedStartAt, booking.plannedEndAt)} />
                    <Row term="Длительность по плану" value={formatDuration(durationMinutes(new Date(booking.plannedStartAt), new Date(booking.plannedEndAt)))} />
                    {booking.actualStartAt && (
                        <Row term="Фактически" value={`${formatMoment(booking.actualStartAt)}${booking.actualEndAt ? ` – ${formatMoment(booking.actualEndAt)}` : ''}`} />
                    )}
                </dl>
            </section>

            <section className={cardClass}>
                <h2 className="text-base font-semibold text-fg">Стоимость</h2>
                <dl className="mt-3 space-y-1.5 text-sm">
                    <Row term="Цена за час" value={`${formatMoney(booking.pricePerHour)} BYN`} />
                    <Row term="Предварительная стоимость" value={`${formatMoney(booking.priceEstimate)} BYN`} />
                    {finished && booking.overdueHours !== null && booking.overdueHours > 0 && (
                        <Row term="Просрочка возврата" value={`${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(booking.overdueHours)} ч`} />
                    )}
                    {finished && booking.pddDiscountApplied && booking.discountAmount !== null && <Row term="Скидка за тест ПДД" value={`−${formatMoney(booking.discountAmount)} BYN`} />}
                </dl>
                {finished && booking.finalPrice !== null && (
                    <div className="mt-3 border-t border-line pt-3">
                        <p className="text-xs text-muted">Итого</p>
                        <p className="text-3xl font-bold tracking-tight text-fg">{formatMoney(booking.finalPrice)} BYN</p>
                    </div>
                )}
            </section>

            {(booking.photosBefore.length > 0 || booking.photosAfter.length > 0) && (
                <section className={`${cardClass} space-y-4`}>
                    <h2 className="text-base font-semibold text-fg">Фото осмотра</h2>
                    <PhotoGrid title="До поездки" urls={booking.photosBefore} />
                    <PhotoGrid title="После поездки" urls={booking.photosAfter} />
                </section>
            )}

            {finished && (
                <section className={cardClass}>
                    <h2 className="text-base font-semibold text-fg">Договор аренды</h2>
                    <p className="mt-1 text-sm text-muted">PDF-документ по этой поездке.</p>
                    <div className="mt-3">
                        <Button variant="outline" loading={downloading} onClick={downloadAgreement} className="sm:w-auto">
                            <FileDown className="size-4" aria-hidden />
                            Скачать договор
                        </Button>
                    </div>
                </section>
            )}

            {finished && toRate.length > 0 && (
                <section className="space-y-3">
                    <h2 className="text-base font-semibold text-fg">Оставьте оценку</h2>
                    {toRate.map((p) => (
                        <RatingForm key={p.target} bookingId={booking.id} target={p.target} />
                    ))}
                </section>
            )}
        </div>
    )
}

function Row({ term, value }: { term: string; value: string }) {
    return (
        <div className="flex justify-between gap-4">
            <dt className="text-muted">{term}</dt>
            <dd className="text-right font-medium text-fg">{value}</dd>
        </div>
    )
}

function Shell({ children }: { children: ReactNode }) {
    return (
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-4">
            <Link to="/app/bookings" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
                <ArrowLeft className="size-4" aria-hidden /> Мои поездки
            </Link>
            {children}
        </div>
    )
}