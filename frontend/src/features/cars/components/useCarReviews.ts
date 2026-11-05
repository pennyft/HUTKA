import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'
import { carsApi } from '../api'
import { plural } from '../format'

/** Отзывы о машине. GET /ratings на бэке требует токен, поэтому для гостя запрос не выполняется. Кэш общий для шапки и списка. */
export function useCarReviews(carId: string) {
  const token = useAuthStore((s) => s.token)
  return useQuery({
    queryKey: ['ratings', 'car', carId],
    queryFn: ({ signal }) => carsApi.reviews(carId, signal),
    enabled: !!token,
  })
}

export function reviewsCountLabel(n: number): string {
  return `${n} ${plural(n, ['отзыв', 'отзыва', 'отзывов'])}`
}
