import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from './api'

/** Прогноз для строки погоды и подписей к поездкам. Если не загрузился, главная работает без погоды. */
export function useForecast() {
  return useQuery({
    queryKey: ['weather', 'forecast'],
    queryFn: ({ signal }) => dashboardApi.forecast(signal),
    staleTime: 10 * 60_000,
    retry: false,
  })
}

/** Скидка за тест ПДД и число оставшихся попыток. Только для подтверждённых (иначе бэк отвечает 403). */
export function usePddSummary(enabled: boolean) {
  return useQuery({
    queryKey: ['home', 'pdd'],
    queryFn: ({ signal }) => dashboardApi.pdd(signal),
    enabled,
    staleTime: 60_000,
    retry: false,
  })
}
