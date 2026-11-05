import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { toast } from '@/shared/ui/toast'
import { useAdminStore } from '../store'
import { adminBookingsApi, type BookingsQuery } from './api'

const useAuthed = () => useAdminStore((s) => s.status === 'authed')

export function useAdminBookings(q: BookingsQuery) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'bookings', q], queryFn: ({ signal }) => adminBookingsApi.list(q, signal), enabled: authed, placeholderData: keepPreviousData })
}

export function useAdminBooking(id: string) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'booking', id], queryFn: ({ signal }) => adminBookingsApi.get(id, signal), enabled: authed && !!id })
}

/** Принудительное закрытие: 409 показывается текстом бэка, после действия обновляются брони, споры и счётчики. */
export function useForceClose() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => adminBookingsApi.forceClose(id),
    onSuccess: () => toast.success('Поездка закрыта принудительно.'),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] })
      void qc.invalidateQueries({ queryKey: ['nav', 'admin-queues'] })
    },
  })
}
