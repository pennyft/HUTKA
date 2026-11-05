import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { ApiError, errorMessage } from '@/api/errors'
import { bookingsApi } from '@/features/bookings/api'
import { BookingStatusBadge } from '@/features/bookings/components/BookingStatusBadge'
import { PhotoGrid } from '@/features/bookings/components/PhotoGrid'
import { RatingForm } from '@/features/bookings/components/RatingForm'
import { useBooking } from '@/features/bookings/hooks'
import { formatMoment, formatPeriod } from '@/features/bookings/period'
import { formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { toast } from '@/shared/ui/toast'
import { BookingRow } from '../components/BookingRow'
import { awaitingResponse } from '../bookingsLogic'
import { usePartnerCars } from '../hooks'

/**
 * P6. Бронь партнёра: фото до и после, итоговая сумма, договор (PDF с токеном, через Blob), оценка арендатора. Спор партнёр сам открыть
 * не может: споры создаёт система при просрочке возврата больше 3 часов, а по спорной ситуации можно написать обращение категории «Спор».
 */
export default function PartnerBookingPage() {
    const { bookingId = '' } = useParams()
    const navigate = useNavigate()
    const { data: b, isPending, isError, error, refetch } = useBooking(bookingId)
    const cars = usePartnerCars()
    const pending = useQuery({ queryKey: ['ratings', 'pending'], queryFn: ({ signal }) => bookingsApi.pendingRatings(signal) })
    const [downloading, setDownloading] = useState(false)

    if (isPending) return <div className="mx-auto max-w-2xl px-4 pt-6"><Skeleton className="h-96 rounded-3xl" aria-hidden /></div>
    if (isError) {
        const notFound = error instanceof ApiError && (error.status === 404 || error.status === 403)
        return (
            <div className="mx-auto max-w-2xl px-4 pb-10 pt-6">
                <div className="rounded-3xl border border-line bg-surface p-8">
                    <h1 className="text-lg font-bold text-fg">{notFound ? 'Бронь не найдена' : 'Не удалось загрузить бронь'}</h1>
                    <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                    <div className="mt-5 flex gap-3">
                        {!notFound && (
                            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        )}
                        <Link to="/partner/bookings" className="inline-block rounded-xl border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-fg hover:bg-surface-2">
                            Все брони
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const car = cars.data?.find((c) => c.id === b.carId)
    const carName = car ? `${car.make} ${car.model}` : 'Автомобиль'
    const finished = b.status === 'finished'
    const toRate = (pending.data ?? []).filter((p) => p.bookingId === b.id && p.target === 'user')
    const overdue = (b.overdueHours ?? 0) > 0

    const download = async () => {
        setDownloading(true)
        try {
            const blob = await bookingsApi.agreement(b.id)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `hutka-agreement-${b.id}.pdf`
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

    return (
        <div className="mx-auto max-w-2xl space-y-5 px-4 pb-10 pt-6">
            <div>
                <Link to="/partner/bookings" className="text-sm text-muted underline hover:opacity-80">
                    Все брони
                </Link>
                <div className="mt-2 flex items-start justify-between gap-3">
                    <h1 className="text-2xl font-bold tracking-tight text-fg">{carName}</h1>
                    <BookingStatusBadge booking={b} />
                </div>
                <p className="mt-1 text-sm text-muted">{formatPeriod(b.plannedStartAt, b.plannedEndAt)}</p>
            </div>

            {awaitingResponse(b) && (
                <ul>
                    <BookingRow booking={b} carName={carName} now={new Date()} />
                </ul>
            )}

            <section className="rounded-3xl border border-line bg-surface p-5">
                <h2 className="mb-3 font-bold text-fg">Итог</h2>
                <dl className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted">Цена за час</dt>
                        <dd className="font-medium text-fg">{formatMoney(b.pricePerHour)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                        <dt className="text-muted">Расчёт при бронировании</dt>
                        <dd className="font-medium text-fg">{formatMoney(b.priceEstimate)}</dd>
                    </div>
                    {b.actualStartAt && (
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted">Фактически</dt>
                            <dd className="font-medium text-fg">{b.actualEndAt ? formatPeriod(b.actualStartAt, b.actualEndAt) : `с ${formatMoment(b.actualStartAt)}`}</dd>
                        </div>
                    )}
                    {overdue && (
                        <div className="flex justify-between gap-3">
                            <dt className="text-muted">Просрочка возврата</dt>
                            <dd className="font-medium text-fg">{b.overdueHours} ч</dd>
                        </div>
                    )}
                    {b.finalPrice !== null && b.finalPrice !== undefined && (
                        <div className="flex justify-between gap-3 border-t border-line pt-2">
                            <dt className="font-semibold text-fg">Итоговая сумма</dt>
                            <dd className="font-bold text-fg">{formatMoney(b.finalPrice)}</dd>
                        </div>
                    )}
                    {b.pddDiscountApplied && <p className="text-xs text-muted">К сумме применена скидка арендатора за тест ПДД.</p>}
                </dl>
                {b.declineReason && <p className="mt-3 text-sm text-muted">Причина отказа: {b.declineReason}</p>}
            </section>

            {(b.photosBefore.length > 0 || b.photosAfter.length > 0) && (
                <section className="space-y-4 rounded-3xl border border-line bg-surface p-5">
                    <PhotoGrid title="Фото до поездки" urls={b.photosBefore} />
                    <PhotoGrid title="Фото после поездки" urls={b.photosAfter} />
                </section>
            )}

            {finished && (
                <section className="rounded-3xl border border-line bg-surface p-5">
                    <h2 className="font-bold text-fg">Договор</h2>
                    <p className="mt-1 text-sm text-muted">PDF-договор по завершённой поездке.</p>
                    <div className="mt-3">
                        <Button variant="outline" loading={downloading} onClick={download} className="sm:w-auto">
                            Скачать договор
                        </Button>
                    </div>
                </section>
            )}

            {toRate.length > 0 && (
                <section className="rounded-3xl border border-line bg-surface p-5">
                    <h2 className="mb-3 font-bold text-fg">Оцените арендатора</h2>
                    {toRate.map((p) => (
                        <RatingForm key={p.target} bookingId={b.id} target={p.target} />
                    ))}
                </section>
            )}

            {(overdue || b.status === 'active' || finished) && (
                <section className="rounded-3xl border border-line bg-surface p-5">
                    <h2 className="font-bold text-fg">Есть проблема с поездкой?</h2>
                    <p className="mt-1 text-sm text-muted">Спор по броне сами открыть нельзя: его создаёт система, если машину не вернули больше чем на 3 часа. По любой спорной ситуации напишите обращение.</p>
                    <div className="mt-3">
                        <Button
                            variant="outline"
                            onClick={() =>
                                navigate('/partner/support/new', { state: { draft: { category: 'dispute', subject: `Спор по брони: ${carName}`, description: `Бронь ${b.id}\n` } } })
                            }
                            className="sm:w-auto"
                        >
                            Написать обращение
                        </Button>
                    </div>
                </section>
            )}
        </div>
    )
}