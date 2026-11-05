import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { toast } from '@/shared/ui/toast'
import { useAdminStore } from '../store'
import { adminTicketsApi, type TicketsQuery } from './api'
import type { AdminTicketDetail } from './types'

const useAuthed = () => useAdminStore((s) => s.status === 'authed')
const ticketKey = (id: string) => ['admin', 'ticket', id] as const

export function useAdminTickets(q: TicketsQuery) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'tickets', q], queryFn: ({ signal }) => adminTicketsApi.list(q, signal), enabled: authed, placeholderData: keepPreviousData, refetchInterval: 60_000 })
}

export function useTicketStats() {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'tickets-stats'], queryFn: ({ signal }) => adminTicketsApi.stats(signal), enabled: authed, refetchInterval: 60_000 })
}

export function useAdminTicket(id: string) {
  const authed = useAuthed()
  return useQuery({ queryKey: ticketKey(id), queryFn: ({ signal }) => adminTicketsApi.get(id, signal), enabled: authed && !!id })
}

/** Ответ: сообщение из ответа сервера сразу попадает в переписку. 409 (тикет закрыт) показываем текстом бэка и перечитываем тикет. */
export function useReplyTicket(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => adminTicketsApi.reply(id, body),
    onSuccess: (message) => {
      qc.setQueryData<AdminTicketDetail>(ticketKey(id), (old) => (old ? { ...old, messages: [...old.messages, message], awaitingAdminSince: null, updatedAt: message.createdAt } : old))
      void qc.invalidateQueries({ queryKey: ['admin', 'tickets'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'tickets-stats'] })
      void qc.invalidateQueries({ queryKey: ['nav', 'admin-queues'] })
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      void qc.invalidateQueries({ queryKey: ticketKey(id) })
    },
  })
}

export function useCloseTicket(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => adminTicketsApi.close(id),
    onSuccess: (detail) => {
      qc.setQueryData(ticketKey(id), detail)
      toast.success('Обращение закрыто, пользователь получит уведомление.')
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'tickets'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'tickets-stats'] })
      void qc.invalidateQueries({ queryKey: ['nav', 'admin-queues'] })
    },
  })
}
