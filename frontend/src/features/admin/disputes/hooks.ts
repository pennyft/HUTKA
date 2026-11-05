import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { toast } from '@/shared/ui/toast'
import type { DisputeStatus } from '../bookings/types'
import { useAdminStore } from '../store'
import { disputesApi } from './api'
import type { ResolveBody } from './types'

const useAuthed = () => useAdminStore((s) => s.status === 'authed')

export function useAdminDisputes(status: DisputeStatus, page: number) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'disputes', status, page], queryFn: ({ signal }) => disputesApi.list(status, page, signal), enabled: authed, placeholderData: keepPreviousData })
}

export function useAdminDispute(id: string) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'dispute', id], queryFn: ({ signal }) => disputesApi.get(id, signal), enabled: authed && !!id })
}

/** Решение по спору. Ошибки суммы (400) и «Спор уже решён» (409) приходят текстом бэка и показываются под формой и тостом. */
export function useResolveDispute(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ResolveBody) => disputesApi.resolve(id, body),
    onSuccess: (detail) => {
      qc.setQueryData(['admin', 'dispute', id], detail)
      toast.success('Решение принято, обе стороны получат уведомление.')
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] })
      void qc.invalidateQueries({ queryKey: ['nav', 'admin-queues'] })
    },
  })
}
