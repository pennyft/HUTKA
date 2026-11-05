import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { PhotoPicker } from '@/shared/photos/PhotoPicker'
import { usePhotoUploader } from '@/shared/photos/usePhotoUploader'
import { Button } from '@/shared/ui/Button'
import { toast } from '@/shared/ui/toast'
import { formatMoment } from '../period'
import type { BookingPhase } from '../status'
import type { Booking } from '../types'
import { tripApi } from './api'
import { canSubmitPhotos, startHint, TRIP_PHOTOS_MAX, TRIP_PHOTOS_MIN, type TripMode } from './logic'

interface Props {
  booking: Booking
  phase: BookingPhase
  now: Date
  /** Ошибка действия показывается в общем блоке экрана брони (там же, где ошибка отмены). */
  onError: (message: string | null) => void
}

const COPY: Record<TripMode, { open: string; title: string; text: string; submit: string; done: string }> = {
  start: {
    open: 'Начать поездку',
    title: 'Фото перед поездкой',
    text: 'Сфотографируйте машину со всех сторон и салон. Эти фото фиксируют состояние до поездки и попадут в договор.',
    submit: 'Начать поездку',
    done: 'Поездка началась. Хорошей дороги!',
  },
  finish: {
    open: 'Завершить поездку',
    title: 'Фото после поездки',
    text: 'Сфотографируйте машину со всех сторон и салон. После завершения платёж спишется автоматически, а договор придёт на почту.',
    submit: 'Завершить поездку',
    done: 'Поездка завершена. Договор отправлен на почту.',
  },
}

/**
 * B10 и B11. Кнопки «Начать поездку» (бронь подтверждена, время пришло) и «Завершить поездку» (поездка идёт)
 * и панель с загрузкой фото. Фото сразу уходят в хранилище, в API отправляются только ссылки. После успеха ответ бэка
 * кладётся в кэш брони, остальные списки перечитываются. Рендерится внутри строки кнопок экрана брони.
 */
export function TripActions({ booking, phase, now, onError }: Props) {
  const [mode, setMode] = useState<TripMode | null>(null)
  const mode0 = phase === 'confirmed' ? 'start' : phase === 'active' ? 'finish' : null
  if (!mode0) return null
  const hint = phase === 'confirmed' ? startHint(booking, now) : null
  const canOpen = phase === 'active' || hint?.kind === 'deadline' || hint?.kind === 'expired'

  return (
    <>
      {mode === null ? (
        <div className="w-full sm:w-auto">
          <Button
            variant="dark"
            disabled={!canOpen}
            className="sm:w-auto"
            onClick={() => {
              onError(null)
              setMode(mode0)
            }}
          >
            {COPY[mode0].open}
          </Button>
        </div>
      ) : (
        <TripPanel key={mode} booking={booking} mode={mode} onClose={() => setMode(null)} onError={onError} />
      )}
      {hint?.kind === 'wait' && <p className="w-full text-sm text-muted">Начать можно с {formatMoment(hint.from.toISOString())}.</p>}
      {hint?.kind === 'deadline' && mode === null && <p className="w-full text-sm text-muted">Начните поездку до {formatMoment(hint.until.toISOString())}, иначе бронь отменится автоматически.</p>}
    </>
  )
}

function TripPanel({ booking, mode, onClose, onError }: { booking: Booking; mode: TripMode; onClose: () => void; onError: Props['onError'] }) {
  const qc = useQueryClient()
  const uploader = usePhotoUploader('bookings', TRIP_PHOTOS_MAX)
  const copy = COPY[mode]
  const submit = useMutation({
    mutationFn: () => (mode === 'start' ? tripApi.start(booking.id, uploader.urls) : tripApi.finish(booking.id, uploader.urls)),
    onSuccess: (updated) => {
      qc.setQueryData(['bookings', 'detail', booking.id], updated)
      for (const key of ['bookings', 'car', 'cars', 'nav', 'ratings']) void qc.invalidateQueries({ queryKey: [key] })
      toast.success(copy.done)
      onClose()
    },
    onError: (e) => onError(errorMessage(e)),
  })

  return (
    <div className="w-full rounded-2xl border border-line bg-surface-2 p-4">
      <h3 className="font-semibold text-fg">{copy.title}</h3>
      <p className="mt-1 text-sm text-muted">{copy.text}</p>
      <div className="mt-3">
        <PhotoPicker uploader={uploader} label="Фото" min={TRIP_PHOTOS_MIN} max={TRIP_PHOTOS_MAX} capture hint="Фото сжимаются и загружаются сразу после выбора." />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="dark" loading={submit.isPending} disabled={!canSubmitPhotos(uploader.urls.length, uploader.busy)} onClick={() => submit.mutate()}>
          {copy.submit}
        </Button>
        <Button variant="outline" disabled={submit.isPending} onClick={onClose}>
          Отмена
        </Button>
      </div>
      {uploader.busy && <p className="mt-2 text-xs text-muted">Дождитесь окончания загрузки фото.</p>}
    </div>
  )
}
