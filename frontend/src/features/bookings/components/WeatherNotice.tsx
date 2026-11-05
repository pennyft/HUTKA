import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { bookingsApi } from '../api'
import { formatHazardRange, HAZARD_LABEL } from '../format'

interface Props {
  latitude: number | null
  longitude: number | null
  /** Корректное окно поездки; null, пока форма невалидна (тогда прогноз не запрашиваем) */
  window: { start: Date; end: Date } | null
}

/**
 * Предупреждение о погоде на время поездки (GET /weather/forecast, блок window).
 * Показывается только если бэк считает окно доступным (поездка в пределах 7 дней). Если прогноз не загрузился
 * (503 у провайдера) или окно недоступно, блока нет совсем: бронированию это не мешает.
 */
export function WeatherNotice({ latitude, longitude, window }: Props) {
  const from = window?.start.toISOString()
  const to = window?.end.toISOString()
  const { data } = useQuery({
    queryKey: ['weather', 'window', latitude, longitude, from, to],
    enabled: !!from && !!to,
    staleTime: 5 * 60_000,
    retry: false,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) => bookingsApi.weatherWindow({ latitude, longitude, from: from!, to: to! }, signal),
  })

  if (!window || !data || !data.available) return null

  if (data.warnings.length === 0) {
    return (
      <p className="rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-muted" aria-live="polite">
        Опасных погодных явлений в прогнозе на это время нет.
      </p>
    )
  }

  return (
    <div className="rounded-2xl border border-danger/40 bg-surface p-4" aria-live="polite">
      <p className="flex items-center gap-2 font-semibold text-fg">
        <TriangleAlert className="size-4 text-danger" aria-hidden />
        Возможна непогода во время поездки
      </p>
      <ul className="mt-2 space-y-1 text-sm text-fg">
        {data.warnings.map((w, i) => (
          <li key={`${w.hazard}-${w.startsAt}-${i}`}>
            <span className="font-medium">{HAZARD_LABEL[w.hazard] ?? w.hazard}</span>
            <span className="text-muted"> · {formatHazardRange(w.startsAt, w.endsAt)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted">Прогноз справочный: решение о поездке остаётся за вами.</p>
    </div>
  )
}
