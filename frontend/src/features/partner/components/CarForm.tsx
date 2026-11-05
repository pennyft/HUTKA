import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { errorMessage } from '@/api/errors'
import { SelectField, TextAreaField } from '@/features/support/components/FormFields'
import { PhotoPicker } from '@/shared/photos/PhotoPicker'
import { usePhotoUploader } from '@/shared/photos/usePhotoUploader'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'
import { buildCarBody, photosProblem } from '../build'
import { useCreateCar } from '../hooks'
import { BODY_TYPES, BOOKING_MODE_LABEL, FUEL_LABEL, FUEL_ORDER, TRANSMISSION_LABEL, TRANSMISSION_ORDER } from '../labels'
import { carDefaults, carSchema, MAX_MILEAGE_KM, MAX_SEATS, MIN_YEAR, PHOTOS_MAX, PHOTOS_MIN, todayLocal, type CarFormValues } from '../schema'
import { scheduleToJson, uniformSchedule, validateSchedule } from '../schedule'
import type { BookingMode } from '../types'
import { ScheduleEditor } from './ScheduleEditor'

const MODES: BookingMode[] = ['instant', 'request_to_book']

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-base font-bold text-fg">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

/**
 * P3 и B24. Форма новой машины: данные, условия, документы, не менее 5 фото (грузятся сразу в хранилище), расписание.
 * POST /partner/cars: заявка уходит администратору. Проверки сервера (год не раньше 2014, пробег до 200 000, техосмотр не в прошлом,
 * расписание, адрес) продублированы здесь; всё, что сервер всё же отвергнет, показывается его текстом под кнопкой.
 * Координаты не передаются: сервер находит их по адресу.
 */
export function CarForm({ onDone }: { onDone: () => void }) {
  const uploader = usePhotoUploader('cars', PHOTOS_MAX)
  const [scheduleOn, setScheduleOn] = useState(false)
  const [schedule, setSchedule] = useState(() => uniformSchedule({ from: '08:00', to: '22:00' }))
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const create = useCreateCar(onDone)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CarFormValues>({ resolver: zodResolver(carSchema), defaultValues: carDefaults })
  const mode = watch('bookingMode')

  function onValid(v: CarFormValues) {
    const photos = photosProblem(uploader.urls.length, uploader.busy)
    const schedProblem = scheduleOn ? validateSchedule(schedule) : null
    setPhotoError(photos)
    setScheduleError(schedProblem)
    if (photos || schedProblem) return
    create.mutate(buildCarBody(v, uploader.urls, scheduleToJson(schedule, scheduleOn)))
  }

  return (
    <form onSubmit={handleSubmit(onValid)} noValidate className="space-y-5">
      <Section title="Автомобиль">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Марка" maxLength={64} error={errors.make?.message} {...register('make')} />
          <TextField label="Модель" maxLength={64} error={errors.model?.message} {...register('model')} />
          <TextField label="Год выпуска" inputMode="numeric" maxLength={4} hint={`Не ранее ${MIN_YEAR}`} error={errors.year?.message} {...register('year')} />
          <TextField label="Госномер" maxLength={16} error={errors.plateNumber?.message} {...register('plateNumber')} />
          <TextField label="Пробег, км" inputMode="numeric" hint={`До ${MAX_MILEAGE_KM.toLocaleString('ru-RU')} км`} error={errors.mileageKm?.message} {...register('mileageKm')} />
          <TextField label="Мест" inputMode="numeric" hint={`От 1 до ${MAX_SEATS}`} error={errors.seats?.message} {...register('seats')} />
          <SelectField label="Топливо" error={errors.fuelType?.message} {...register('fuelType')}>
            <option value="">Выберите</option>
            {FUEL_ORDER.map((f) => (
              <option key={f} value={f}>
                {FUEL_LABEL[f]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Коробка передач" error={errors.transmission?.message} {...register('transmission')}>
            <option value="">Выберите</option>
            {TRANSMISSION_ORDER.map((t) => (
              <option key={t} value={t}>
                {TRANSMISSION_LABEL[t]}
              </option>
            ))}
          </SelectField>
          <SelectField label="Кузов" error={errors.bodyType?.message} {...register('bodyType')}>
            <option value="">Выберите</option>
            {BODY_TYPES.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </SelectField>
        </div>
        <TextAreaField label="Описание (необязательно)" rows={4} maxLength={2000} error={errors.description?.message} {...register('description')} />
      </Section>

      <Section title="Условия аренды">
        <TextField label="Адрес, где забирают машину" maxLength={255} hint="Сервер сам найдёт точку на карте по адресу" placeholder="Минск, пр. Независимости, 1" error={errors.address?.message} {...register('address')} />
        <TextField label="Цена за час, BYN" inputMode="decimal" error={errors.pricePerHour?.message} {...register('pricePerHour')} />
        <fieldset>
          <legend className="mb-1.5 text-xs font-medium text-fg">Режим бронирования</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {MODES.map((m) => (
              <label key={m} className="block cursor-pointer">
                <input type="radio" value={m} className="peer sr-only" {...register('bookingMode')} />
                <span className="block rounded-2xl border border-line bg-surface p-3 transition-colors hover:bg-surface-2 peer-checked:border-primary peer-checked:bg-accent peer-checked:text-accent-fg peer-focus-visible:ring-2 peer-focus-visible:ring-primary">
                  <span className="block text-sm font-semibold">{BOOKING_MODE_LABEL[m].title}</span>
                  <span className="mt-0.5 block text-xs opacity-80">{BOOKING_MODE_LABEL[m].text}</span>
                </span>
              </label>
            ))}
          </div>
          {errors.bookingMode?.message && <p className="mt-1 text-xs text-danger">{errors.bookingMode.message}</p>}
          <p className="sr-only" aria-live="polite">
            Выбрано: {BOOKING_MODE_LABEL[mode as BookingMode]?.title}
          </p>
        </fieldset>
      </Section>

      <Section title="Документы">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Номер техпаспорта" maxLength={64} error={errors.techPassportNumber?.message} {...register('techPassportNumber')} />
          <TextField label="Номер страхового полиса" maxLength={64} error={errors.insurancePolicyNumber?.message} {...register('insurancePolicyNumber')} />
        </div>
        <TextField label="Техосмотр действителен до" type="date" min={todayLocal()} error={errors.inspectionExpiryDate?.message} {...register('inspectionExpiryDate')} />
      </Section>

      <Section title="Фотографии">
        <PhotoPicker uploader={uploader} label="Фото машины" min={PHOTOS_MIN} max={PHOTOS_MAX} error={photoError ?? undefined} hint="Снаружи со всех сторон и салон. Первое фото станет обложкой в каталоге." />
      </Section>

      <Section title="Когда машину можно брать">
        <ScheduleEditor
          enabled={scheduleOn}
          onToggle={(on) => {
            setScheduleOn(on)
            setScheduleError(null)
          }}
          value={schedule}
          onChange={(next) => {
            setSchedule(next)
            setScheduleError(null)
          }}
          error={scheduleError}
        />
      </Section>

      {create.isError && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-surface-2 p-3 text-sm text-fg">
          {errorMessage(create.error)}
        </p>
      )}
      <Button type="submit" variant="dark" loading={create.isPending}>
        {create.isPending ? 'Отправляем…' : 'Отправить на модерацию'}
      </Button>
    </form>
  )
}
