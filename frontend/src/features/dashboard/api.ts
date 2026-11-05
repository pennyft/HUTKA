import { http } from '@/api/http'
import type { DayForecast, PddSummary } from './types'

export const dashboardApi = {
  /**
   * GET /weather/forecast без параметров: точка по умолчанию (центр Минска, app.weather.default-latitude/longitude).
   * Бэк отдаёт 7 дней начиная с сегодняшнего (по минскому времени). Недоступность провайдера (503) главную не ломает.
   */
  forecast: (signal?: AbortSignal) => http.request<{ days: DayForecast[] }>('/weather/forecast', { signal }).then((r) => r.days),

  /** GET /pddtest/attempts: цикл попыток и действующая скидка. */
  pdd: (signal?: AbortSignal) => http.request<PddSummary>('/pddtest/attempts', { signal }),
}
