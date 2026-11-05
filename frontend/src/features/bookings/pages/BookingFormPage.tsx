import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { todayIso } from '@/shared/lib/date'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'
import { Skeleton } from '@/shared/ui/Skeleton'
import { toast } from '@/shared/ui/toast'
import type { Car } from '@/shared/types/car'
// Фото и данные машины переиспользуем из каталога (позже эти куски стоит вынести в shared)
import { CarPhoto } from '@/features/cars/components/CarPhoto'
import { bookingModeNote } from '@/features/cars/components/useBookCta'
import { carsApi } from '@/features/cars/api'
import { formatPrice } from '@/features/cars/format'
import { bookingsApi } from '../api'
import { WeatherNotice } from '../components/WeatherNotice'
import { formatMoney } from '../format'
import { durationMinutes, estimateAmount } from '../pricing'
import { defaultStart, formatDuration, fromLocalParts, toLocalParts, validateRange } from '../time'
import { useNow } from '../useNow'

const HOUR = 60 * 60_000
const DURATIONS = [
    { label: '1 ч', minutes: 60 },
    { label: '2 ч', minutes: 120 },
    { label: '4 ч', minutes: 240 },
    { label: '8 ч', minutes: 480 },
    { label: 'Сутки', minutes: 1440 },
]

const cardClass = 'rounded-3xl border border-line bg-surface p-5'

/**
 * B7. Форма бронирования: /app/bookings/new?carId=...
 * Маршрут закрыт гейтом RequireVerified. Время вводится в часовом поясе браузера и уходит на бэк в UTC.
 * Проверки времени повторяют бэк (AvailabilityService), а занятость и расписание бэк проверяет сам: 409 с текстом.
 */
export default function BookingFormPage() {
    const [sp] = useSearchParams()
    const carId = sp.get('carId') ?? ''
    const { data: car, isPending, isError, error, refetch } = useQuery({
        queryKey: ['car', carId],
        queryFn: ({ signal }) => carsApi.details(carId, signal),
        enabled: !!carId,
    })

    if (!carId) {
        return (
            <Shell back={{ to: '/cars', label: 'Каталог' }}>
                <Message title="Машина не выбрана" text="Выберите машину в каталоге и нажмите «Забронировать»." />
            </Shell>
        )
    }
    if (isPending) {
        return (
            <Shell back={{ to: `/cars/${carId}`, label: 'К машине' }}>
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]" aria-hidden>
                    <div className="space-y-5">
                        <Skeleton className="h-24 w-full rounded-3xl" />
                        <Skeleton className="h-64 w-full rounded-3xl" />
                    </div>
                    <Skeleton className="h-64 w-full rounded-3xl" />
                </div>
            </Shell>
        )
    }
    if (isError) {
        return (
            <Shell back={{ to: '/cars', label: 'Каталог' }}>
                <Message title="Не удалось загрузить машину" text={errorMessage(error)}>
                    <Button variant="outline" onClick={() => refetch()} className="w-auto">
                        Повторить
                    </Button>
                </Message>
            </Shell>
        )
    }
    return (
        <Shell back={{ to: `/cars/${car.id}`, label: 'К машине' }}>
            <BookingForm car={car} />
        </Shell>
    )
}

function BookingForm({ car }: { car: Car }) {
    const navigate = useNavigate()
    const qc = useQueryClient()
    const mode = car.bookingMode
    const modeInfo = bookingModeNote(car)

    // Начальные значения считаем один раз: начало по режиму брони, длительность 2 часа
    const [initial] = useState(() => {
        const start = defaultStart(mode, new Date())
        return { start: toLocalParts(start), end: toLocalParts(new Date(start.getTime() + 2 * HOUR)) }
    })
    const [startDate, setStartDate] = useState(initial.start.date)
    const [startTime, setStartTime] = useState(initial.start.time)
    const [endDate, setEndDate] = useState(initial.end.date)
    const [endTime, setEndTime] = useState(initial.end.time)
    const [serverError, setServerError] = useState<string | null>(null)

    const start = fromLocalParts(startDate, startTime)
    const end = fromLocalParts(endDate, endTime)
    const now = useNow()
    const rangeError = validateRange({ start, end, mode, now })
    const validRange = !rangeError && start && end ? { start, end } : null
    const amount = validRange ? estimateAmount(validRange.start, validRange.end, car.pricePerHour) : null
    const minutes = start && end ? durationMinutes(start, end) : 0
    const unavailable = car.status === 'under_review'

    /** Меняем начало и сдвигаем конец, сохраняя длительность: так пользователю не приходится править обе даты. */
    function changeStart(date: string, time: string) {
        const keep = start && end && end > start ? end.getTime() - start.getTime() : 2 * HOUR
        setStartDate(date)
        setStartTime(time)
        const next = fromLocalParts(date, time)
        if (next) {
            const e = toLocalParts(new Date(next.getTime() + keep))
            setEndDate(e.date)
            setEndTime(e.time)
        }
        setServerError(null)
    }

    function setDuration(mins: number) {
        if (!start) return
        const e = toLocalParts(new Date(start.getTime() + mins * 60_000))
        setEndDate(e.date)
        setEndTime(e.time)
        setServerError(null)
    }

    const create = useMutation({
        mutationFn: (range: { start: Date; end: Date }) =>
            bookingsApi.create({ carId: car.id, plannedStartAt: range.start.toISOString(), plannedEndAt: range.end.toISOString() }),
        onSuccess: (booking) => {
            toast.success(booking.confirmedAt ? 'Бронь подтверждена.' : 'Заявка отправлена партнёру. Он ответит в течение 6 часов.')
            qc.invalidateQueries({ queryKey: ['bookings'] })
            qc.invalidateQueries({ queryKey: ['car', car.id] })
            qc.invalidateQueries({ queryKey: ['cars'] })
            navigate(`/app/bookings/${booking.id}`, { replace: true })
        },
        onError: (e) => setServerError(errorMessage(e)),
    })

    function submit(e: FormEvent) {
        e.preventDefault()
        setServerError(null)
        // повторяем проверку со свежим «сейчас»: пока форму заполняли, время идёт
        const s = fromLocalParts(startDate, startTime)
        const en = fromLocalParts(endDate, endTime)
        const err = validateRange({ start: s, end: en, mode, now: new Date() })
        if (err || !s || !en) {
            setServerError(err ?? 'Укажите дату и время начала и окончания')
            return
        }
        create.mutate({ start: s, end: en })
    }

    return (
        <>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-fg">Бронирование</h1>

            <form onSubmit={submit} noValidate className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
                <div className="min-w-0 space-y-5">
                    <div className={`${cardClass} flex items-center gap-4`}>
                        <CarPhoto src={car.photos?.[0]} className="h-16 w-24 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-fg">
                                {car.make} {car.model}, {car.year}
                            </p>
                            <p className="truncate text-sm text-muted">{car.address}</p>
                            <p className="mt-0.5 text-sm font-medium text-fg">
                                {formatPrice(car.pricePerHour)} <span className="text-xs font-normal text-muted">BYN в час</span>
                            </p>
                        </div>
                    </div>

                    {unavailable && <p className="rounded-2xl border border-danger/40 bg-surface p-4 text-sm text-fg">Машина сейчас недоступна для бронирования.</p>}

                    <div className={`${cardClass} space-y-5`}>
                        <h2 className="text-base font-semibold text-fg">Когда нужна машина</h2>

                        <fieldset>
                            <legend className="mb-2 text-sm font-medium text-fg">Начало</legend>
                            <div className="grid grid-cols-2 gap-3">
                                <TextField id="start-date" label="Дата" type="date" min={todayIso()} value={startDate} onChange={(e) => changeStart(e.target.value, startTime)} />
                                <TextField id="start-time" label="Время" type="time" step={900} value={startTime} onChange={(e) => changeStart(startDate, e.target.value)} />
                            </div>
                        </fieldset>

                        <fieldset>
                            <legend className="mb-2 text-sm font-medium text-fg">Окончание</legend>
                            <div className="grid grid-cols-2 gap-3">
                                <TextField
                                    id="end-date"
                                    label="Дата"
                                    type="date"
                                    min={startDate || todayIso()}
                                    value={endDate}
                                    onChange={(e) => {
                                        setEndDate(e.target.value)
                                        setServerError(null)
                                    }}
                                />
                                <TextField
                                    id="end-time"
                                    label="Время"
                                    type="time"
                                    step={900}
                                    value={endTime}
                                    onChange={(e) => {
                                        setEndTime(e.target.value)
                                        setServerError(null)
                                    }}
                                />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Быстрый выбор длительности">
                                {DURATIONS.map((d) => {
                                    const active = minutes === d.minutes
                                    return (
                                        <button
                                            key={d.minutes}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => setDuration(d.minutes)}
                                            className={`h-9 rounded-full border px-3.5 text-sm transition-colors ${active ? 'border-primary bg-accent font-medium text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
                                        >
                                            {d.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </fieldset>

                        {rangeError && (
                            <p className="text-sm text-danger" aria-live="polite">
                                {rangeError}
                            </p>
                        )}
                    </div>

                    <WeatherNotice latitude={car.latitude} longitude={car.longitude} window={validRange} />
                </div>

                <aside className={`${cardClass} lg:sticky lg:top-[72px]`}>
                    <h2 className="text-base font-semibold text-fg">Итого</h2>
                    <dl className="mt-3 space-y-1.5 text-sm">
                        <Row term="Длительность" value={validRange ? formatDuration(minutes) : '—'} />
                        <Row term="Цена за час" value={`${formatPrice(car.pricePerHour)} BYN`} />
                    </dl>
                    <div className="mt-3 border-t border-line pt-3">
                        <p className="text-xs text-muted">Предварительная стоимость</p>
                        <p className="text-3xl font-bold tracking-tight text-fg">{amount !== null ? `${formatMoney(amount)} BYN` : '—'}</p>
                    </div>

                    <p className="mt-4 text-sm text-fg">
                        <span className="font-medium">{modeInfo.badge}.</span> <span className="text-muted">{modeInfo.text}</span>
                    </p>

                    {serverError && (
                        <p role="alert" className="mt-4 rounded-xl border border-danger/40 bg-surface-2 p-3 text-sm text-fg">
                            {serverError}
                        </p>
                    )}

                    <div className="mt-4">
                        <Button type="submit" loading={create.isPending} disabled={!!rangeError || unavailable}>
                            {create.isPending ? 'Отправляем…' : mode === 'instant' ? 'Забронировать' : 'Отправить заявку'}
                        </Button>
                    </div>
                    <p className="mt-3 text-xs text-muted">
                        Итог считается при завершении поездки по фактическому времени: просроченные часы оплачиваются по тарифу ×1,5, скидка за тест ПДД
                        учитывается автоматически.
                    </p>
                </aside>
            </form>
        </>
    )
}

function Row({ term, value }: { term: string; value: string }) {
    return (
        <div className="flex justify-between gap-3">
            <dt className="text-muted">{term}</dt>
            <dd className="font-medium text-fg">{value}</dd>
        </div>
    )
}

function Shell({ back, children }: { back: { to: string; label: string }; children: ReactNode }) {
    return (
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-4">
            <Link to={back.to} className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
                <ArrowLeft className="size-4" aria-hidden /> {back.label}
            </Link>
            {children}
        </div>
    )
}

function Message({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
    return (
        <div className="mt-4 rounded-3xl border border-line bg-surface p-8">
            <h1 className="text-lg font-bold text-fg">{title}</h1>
            <p className="mt-1 text-sm text-muted">{text}</p>
            {children && <div className="mt-5">{children}</div>}
        </div>
    )
}