import type { WeatherHazard } from '@/features/bookings/types'

/** День прогноза из GET /weather/forecast (DayForecast). date: локальная дата Минска (YYYY-MM-DD). */
export interface DayForecast {
  date: string
  weatherCode: number
  temperatureMinC: number | null
  temperatureMaxC: number | null
  precipitationSumMm: number | null
  windGustMaxKmh: number | null
  hazards: WeatherHazard[]
}

/** Нужные главной поля GET /pddtest/attempts. Эндпоинт только для подтверждённых (403 иначе). */
export interface PddSummary {
  cycle: { maxAttempts: number; attemptsLeft: number; nextCycleAt: string | null }
  activeDiscount: { grantedAt: string; expiresAt: string; percent: number } | null
}
