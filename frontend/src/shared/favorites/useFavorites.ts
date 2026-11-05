import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { http } from '@/api/http'
import { errorMessage } from '@/api/errors'
import { useAuthStore } from '@/features/auth/store'
import { toast } from '@/shared/ui/toast'
import type { Car } from '@/shared/types/car'

export const FAVORITES_KEY = ['favorites'] as const

/** GET /favorites: массив машин (до 200). Для гостя не запрашивается. */
export function useFavorites() {
  const token = useAuthStore((s) => s.token)
  return useQuery({ queryKey: FAVORITES_KEY, enabled: !!token, queryFn: () => http.request<Car[]>('/favorites') })
}

/**
 * Добавить/убрать из избранного с мгновенным откликом: кэш правится сразу, при ошибке откатывается.
 * Бэк: POST и DELETE /favorites/{carId} (204), при лимите 200 машин 409 с текстом.
 */
export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ car, isFav }: { car: Car; isFav: boolean }) =>
      http.request(`/favorites/${car.id}`, { method: isFav ? 'DELETE' : 'POST' }),
    onMutate: async ({ car, isFav }) => {
      await qc.cancelQueries({ queryKey: FAVORITES_KEY })
      const prev = qc.getQueryData<Car[]>(FAVORITES_KEY)
      // список ещё не загружен: нечего править, дождёмся перечитывания в onSettled
      if (prev) qc.setQueryData<Car[]>(FAVORITES_KEY, isFav ? prev.filter((c) => c.id !== car.id) : [...prev, car])
      return { prev }
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(FAVORITES_KEY, ctx.prev)
      toast.error(errorMessage(e))
    },
    onSettled: () => qc.invalidateQueries({ queryKey: FAVORITES_KEY }),
  })
}
