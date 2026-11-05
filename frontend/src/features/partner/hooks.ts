import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, errorMessage } from '@/api/errors'
import { useAuthStore } from '@/features/auth/store'
import type { BookingStatus } from '@/features/bookings/types'
import { toast } from '@/shared/ui/toast'
import { partnerApi, type PartnerBookingsQuery } from './api'
import type { BankDetailsBody, CreateCarBody, UpdateCarBody } from './types'

export const PARTNER_CARS_KEY = ['partner', 'cars'] as const
const REVIEWS_PAGE = 20
const PAYOUTS_PAGE = 20

const useToken = () => useAuthStore((s) => s.token)

/** Свои машины и заявки со статусом модерации. */
export function usePartnerCars() {
  const token = useToken()
  return useQuery({ queryKey: PARTNER_CARS_KEY, queryFn: ({ signal }) => partnerApi.cars(signal), enabled: !!token })
}

/**
 * Отправка заявки на машину. После успеха перечитываем список заявок (и плашку на главной). Статус партнёра меняется не здесь:
 * isPartner станет true после одобрения администратором (уведомление car_approved, SocketBridge перечитывает профиль).
 */
export function useCreateCar(onDone?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateCarBody) => partnerApi.createCar(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['partner'] })
      void qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Заявка отправлена на модерацию.')
      onDone?.()
    },
    // текст ошибки бэка (год, пробег, техосмотр, расписание, адрес) показывает сама форма
  })
}

export function useUpdateCar(id: string, onDone?: () => void) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateCarBody) => partnerApi.updateCar(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['partner'] })
      void qc.invalidateQueries({ queryKey: ['car', id] })
      void qc.invalidateQueries({ queryKey: ['cars'] })
      toast.success('Изменения сохранены.')
      onDone?.()
    },
  })
}

/** Скрыть, показать и удалить машину. Ошибку (403 для скрытой админом, 409 для удаления) показываем тостом текстом бэка. */
export function useCarActions() {
  const qc = useQueryClient()
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['partner'] })
    void qc.invalidateQueries({ queryKey: ['cars'] })
    void qc.invalidateQueries({ queryKey: ['car'] })
  }
  const toggle = useMutation({
    mutationFn: (v: { id: string; hidden: boolean }) => partnerApi.setVisibility(v.id, v.hidden),
    onSuccess: (_d, v) => {
      toast.success(v.hidden ? 'Машина скрыта из каталога.' : 'Машина снова в каталоге.')
      refresh()
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      refresh()
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => partnerApi.deleteCar(id),
    onSuccess: () => {
      toast.success('Машина удалена.')
      refresh()
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
  return { toggle, remove }
}

/** Брони партнёра с фильтрами. Ключ начинается с 'bookings': SocketBridge сбрасывает его по уведомлениям, плюс обновление раз в минуту. */
export function usePartnerBookings(q: PartnerBookingsQuery, enabled = true) {
  const token = useToken()
  return useQuery({
    queryKey: ['bookings', 'partner', q],
    queryFn: ({ signal }) => partnerApi.bookings(q, signal),
    enabled: !!token && enabled,
    refetchInterval: 60_000,
  })
}

/** Решение по заявке Request to Book. После любого исхода (в том числе 409 «уже обработана») список перечитывается. */
export function useBookingDecision() {
  const qc = useQueryClient()
  const after = () => {
    void qc.invalidateQueries({ queryKey: ['bookings'] })
    void qc.invalidateQueries({ queryKey: ['nav'] })
    void qc.invalidateQueries({ queryKey: ['partner'] })
  }
  const approve = useMutation({
    mutationFn: (id: string) => partnerApi.approve(id),
    onSuccess: () => toast.success('Заявка одобрена.'),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: after,
  })
  const decline = useMutation({
    mutationFn: (v: { id: string; reason: string }) => partnerApi.decline(v.id, v.reason),
    onSuccess: () => toast.success('Заявка отклонена.'),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: after,
  })
  return { approve, decline }
}

/** Среднее и число оценок арендатора. Ошибку не показываем: рейтинг вспомогательный. */
export function useRenterRating(userId: string) {
  return useQuery({ queryKey: ['ratings', 'user', userId], queryFn: ({ signal }) => partnerApi.userRatings(userId, signal), staleTime: 5 * 60_000, retry: false })
}

export function usePartnerAnalytics(p: { weeks?: number; months?: number; days?: number }) {
  const token = useToken()
  return useQuery({ queryKey: ['partner', 'analytics', p], queryFn: ({ signal }) => partnerApi.analytics(p, signal), enabled: !!token, staleTime: 60_000 })
}

export function usePartnerIncome(month: string, enabled: boolean) {
  return useQuery({ queryKey: ['partner', 'income', month], queryFn: ({ signal }) => partnerApi.income(month, signal), enabled, staleTime: 60_000 })
}

export function usePartnerReviews() {
  const token = useToken()
  return useInfiniteQuery({
    queryKey: ['partner', 'reviews'],
    enabled: !!token,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => partnerApi.reviews(pageParam, REVIEWS_PAGE, signal),
    getNextPageParam: (last, all) => (all.reduce((n, p) => n + p.items.length, 0) < last.total ? all.length : undefined),
  })
}

export function usePartnerPayouts() {
  const token = useToken()
  return useInfiniteQuery({
    queryKey: ['partner', 'payouts'],
    enabled: !!token,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => partnerApi.payouts(pageParam, PAYOUTS_PAGE, signal),
    getNextPageParam: (last, all) => (all.reduce((n, p) => n + p.items.length, 0) < last.total ? all.length : undefined),
  })
}

export function usePayout(id: string) {
  return useQuery({ queryKey: ['partner', 'payout', id], queryFn: ({ signal }) => partnerApi.payout(id, signal), enabled: !!id })
}

export function useBankDetails() {
  const token = useToken()
  return useQuery({ queryKey: ['partner', 'bank'], queryFn: ({ signal }) => partnerApi.bankDetails(signal), enabled: !!token })
}

export function useSaveBankDetails() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: BankDetailsBody) => partnerApi.saveBankDetails(body),
    onSuccess: (saved) => {
      qc.setQueryData(['partner', 'bank'], saved)
      toast.success('Реквизиты сохранены.')
    },
  })
}

/** Для проверки статуса ответа: 409 «Заявка уже обработана» не ошибка пользователя, это гонка с таймером. */
export const isConflict = (e: unknown) => e instanceof ApiError && e.status === 409
export type { BookingStatus }
