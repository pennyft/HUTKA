import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { errorMessage } from '@/api/errors'
import { TextAreaField } from '@/features/support/components/FormFields'
import { PhotoPicker } from '@/shared/photos/PhotoPicker'
import { usePhotoUploader } from '@/shared/photos/usePhotoUploader'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { TextField } from '@/shared/ui/fields'
import { photosProblem } from '../build'
import { ScheduleEditor } from '../components/ScheduleEditor'
import { buildUpdateBody, isEmptyUpdate } from '../editLogic'
import { usePartnerCars, useUpdateCar } from '../hooks'
import { BOOKING_MODE_LABEL } from '../labels'
import { parseSchedule, scheduleToJson, uniformSchedule, validateSchedule } from '../schedule'
import { MAX_PRICE, parsePrice, PHOTOS_MAX, PHOTOS_MIN } from '../schema'
import type { BookingMode, PartnerCar } from '../types'

interface Values {
    pricePerHour: string
    address: string
    bookingMode: BookingMode
    description: string
}

/**
 * P4. Редактирование машины: цена, адрес, режим бронирования, описание, фото (минимум 5), расписание. PATCH /partner/cars/{id} отправляет
 * только изменённые поля. Текущее расписание и описание API не возвращает, поэтому форма их не показывает: описание пустое значит
 * «не менять», расписание меняется только после явного включения. Смена адреса при активных бронях даёт 409 (текст покажется под кнопкой).
 */
export default function PartnerCarEditPage() {
    const { carId = '' } = useParams()
    const { data: cars, isPending, isError, error, refetch } = usePartnerCars()
    const car = cars?.find((c) => c.id === carId)

    if (isPending) return <div className="mx-auto max-w-2xl px-4 pt-6"><Skeleton className="h-96 rounded-3xl" aria-hidden /></div>
    if (isError || !car) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-10 pt-6">
                <div className="rounded-3xl border border-line bg-surface p-8">
                    <h1 className="text-lg font-bold text-fg">{isError ? 'Не удалось загрузить машину' : 'Машина не найдена'}</h1>
                    {isError && <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>}
                    <div className="mt-5 flex gap-3">
                        {isError && (
                            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        )}
                        <Link to="/partner/cars" className="inline-block rounded-xl border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-fg hover:bg-surface-2">
                            Мои машины
                        </Link>
                    </div>
                </div>
            </div>
        )
    }
    return <EditForm key={car.id} car={car} />
}

function EditForm({ car }: { car: PartnerCar }) {
    const navigate = useNavigate()
    const uploader = usePhotoUploader('cars', PHOTOS_MAX, car.photos)
    const update = useUpdateCar(car.id, () => navigate('/partner/cars'))
    // текущее расписание бэк отдаёт в PartnerCarResponse: показываем его, а не пустую форму
    const current = parseSchedule(car.availabilitySchedule)
    const [scheduleOn, setScheduleOn] = useState(current !== null)
    const [schedule, setSchedule] = useState(() => current ?? uniformSchedule({ from: '08:00', to: '22:00' }))
    const [problem, setProblem] = useState<string | null>(null)
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<Values>({ defaultValues: { pricePerHour: String(car.pricePerHour).replace('.', ','), address: car.address, bookingMode: car.bookingMode, description: car.description ?? '' } })
    const mode = watch('bookingMode')

    function onValid(v: Values) {
        const price = parsePrice(v.pricePerHour)
        const photos = photosProblem(uploader.urls.length, uploader.busy)
        const sched = scheduleOn ? validateSchedule(schedule) : null
        const msg = !(price > 0 && price <= MAX_PRICE) ? 'Цена за час: число больше нуля, до двух знаков после запятой' : !v.address.trim() ? 'Укажите адрес' : (photos ?? sched)
        setProblem(msg)
        if (msg) return
        const body = buildUpdateBody(car, { pricePerHour: price, address: v.address, bookingMode: v.bookingMode, description: v.description }, uploader.urls, scheduleToJson(schedule, scheduleOn))
        if (isEmptyUpdate(body)) {
            setProblem('Нечего сохранять: вы ничего не изменили.')
            return
        }
        update.mutate(body)
    }

    return (
        <div className="mx-auto max-w-2xl space-y-5 px-4 pb-10 pt-6">
            <div>
                <Link to="/partner/cars" className="text-sm text-muted underline hover:opacity-80">
                    Мои машины
                </Link>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">
                    {car.make} {car.model}: редактирование
                </h1>
                <p className="mt-1 text-sm text-muted">Изменения цены и расписания касаются только новых броней.</p>
            </div>

            <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-5">
                <section className="space-y-4 rounded-3xl border border-line bg-surface p-5">
                    <TextField label="Цена за час, BYN" inputMode="decimal" {...register('pricePerHour')} error={errors.pricePerHour?.message} />
                    <TextField label="Адрес" maxLength={255} hint="Сменить адрес можно, пока у машины нет активных броней" {...register('address')} />
                    <fieldset>
                        <legend className="mb-1.5 text-xs font-medium text-fg">Режим бронирования</legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {(['instant', 'request_to_book'] as const).map((m) => (
                                <label key={m} className="block cursor-pointer">
                                    <input type="radio" value={m} className="peer sr-only" {...register('bookingMode')} />
                                    <span className="block rounded-2xl border border-line bg-surface p-3 transition-colors hover:bg-surface-2 peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-fg peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                    <span className="block text-sm font-semibold">{BOOKING_MODE_LABEL[m].title}</span>
                    <span className="mt-0.5 block text-xs opacity-80">{BOOKING_MODE_LABEL[m].text}</span>
                  </span>
                                </label>
                            ))}
                        </div>
                        <p className="sr-only" aria-live="polite">
                            Выбрано: {BOOKING_MODE_LABEL[mode].title}
                        </p>
                    </fieldset>
                    <TextAreaField label="Описание" rows={4} maxLength={2000} hint="Пустое описание не отправляется: прежнее останется" {...register('description')} />
                </section>

                <section className="rounded-3xl border border-line bg-surface p-5">
                    <PhotoPicker uploader={uploader} label="Фотографии" min={PHOTOS_MIN} max={PHOTOS_MAX} hint="Список заменяется целиком: удалите ненужные и добавьте новые." />
                </section>

                <section className="rounded-3xl border border-line bg-surface p-5">
                    <h2 className="mb-1 text-base font-bold text-fg">Расписание</h2>
                    <p className="mb-3 text-sm text-muted">Окна, когда машину можно брать. Изменения касаются только новых броней.</p>
                    <ScheduleEditor enabled={scheduleOn} onToggle={setScheduleOn} value={schedule} onChange={setSchedule} />
                    {current !== null && !scheduleOn && (
                        <p className="mt-2 text-xs text-muted">Если выключить ограничение, прежнее расписание сохранится. Чтобы снять ограничение, оставьте его включённым и выберите «Круглосуточно».</p>
                    )}
                </section>

                {(problem || update.isError) && (
                    <p role="alert" className="rounded-xl border border-danger/40 bg-surface-2 p-3 text-sm text-fg">
                        {problem ?? (update.isError ? errorMessage(update.error) : '')}
                    </p>
                )}
                <Button type="submit" variant="dark" loading={update.isPending}>
                    Сохранить
                </Button>
            </form>
        </div>
    )
}