import { useQueries, useQuery } from '@tanstack/react-query'
import { carsApi } from '@/features/cars/api'
import type { Car } from '@/shared/types/car'
import { bookingsApi } from './api'

/** Все брони арендатора (одним запросом, без страниц). Подстраховка к WebSocket: раз в минуту перечитываем. */
export function useMyBookings() {
  return useQuery({
    queryKey: ['bookings', 'list'],
    queryFn: ({ signal }) => bookingsApi.list(undefined, signal),
    refetchInterval: 60_000,
  })
}

/** Одна бронь. Пока она ждёт ответа или идёт, перечитываем раз в 30 секунд на случай, если уведомление по сокету не дошло. */
export function useBooking(id: string) {
  return useQuery({
    queryKey: ['bookings', 'detail', id],
    queryFn: ({ signal }) => bookingsApi.get(id, signal),
    enabled: !!id,
    refetchInterval: (q) => {
      const status = q.state.data?.status
      return status === 'pending' || status === 'active' ? 30_000 : false
    },
  })
}

export interface CarLookup {
  car?: Car
  /** Машину не удалось получить (404 для скрытой или удалённой): показываем запасной текст */
  missing: boolean
  loading: boolean
}

/**
 * Название и фото машин для списка броней. В брони есть только carId, поэтому подгружаем GET /cars/{id}
 * (кэш общий с каталогом и страницей машины, ключ ['car', id]). Повторов нет: 404 для скрытой машины ожидаем.
 */
export function useCarsById(ids: string[]): Record<string, CarLookup> {
  const unique = [...new Set(ids)].sort()
  const results = useQueries({
    queries: unique.map((id) => ({
      queryKey: ['car', id],
      queryFn: ({ signal }: { signal: AbortSignal }) => carsApi.details(id, signal),
      staleTime: 60_000,
      retry: false,
    })),
  })
  const map: Record<string, CarLookup> = {}
  unique.forEach((id, i) => {
    const r = results[i]
    map[id] = { car: r.data, missing: r.isError, loading: r.isPending }
  })
  return map
}
