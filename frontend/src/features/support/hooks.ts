import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { ApiError, errorMessage } from '@/api/errors'
import { toast } from '@/shared/ui/toast'
import { supportApi } from './api'
import { supportBase, toApiStatus, type StatusFilter } from './logic'
import type { Cabinet, CreateTicketBody, TicketDetail } from './types'

const ticketKey = (id: string) => ['support', 'ticket', id] as const

/** Список обращений постранично. Следующая страница есть, пока загружено меньше total. */
export function useTickets(cabinet: Cabinet, filter: StatusFilter) {
  return useInfiniteQuery({
    queryKey: ['support', 'list', cabinet, filter],
    queryFn: ({ pageParam, signal }) => supportApi.list({ audience: cabinet, status: toApiStatus(filter), page: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (last, all) => (all.reduce((n, p) => n + p.items.length, 0) < last.total ? all.length : undefined),
  })
}

export function useTicket(id: string) {
  return useQuery({ queryKey: ticketKey(id), queryFn: ({ signal }) => supportApi.get(id, signal), enabled: !!id })
}

/** Создание: после успеха открываем созданное обращение (replace, чтобы «назад» не вёл на пустую форму). */
export function useCreateTicket(cabinet: Cabinet) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: (body: CreateTicketBody) => supportApi.create(body),
    onSuccess: (ticket) => {
      qc.setQueryData(ticketKey(ticket.id), ticket)
      void qc.invalidateQueries({ queryKey: ['support', 'list'] })
      navigate(`${supportBase(cabinet)}/${ticket.id}`, { replace: true })
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
}

/** Сообщение пользователя: добавляем в кэш переписки сразу из ответа сервера. При 409 (тикет закрыт) перечитываем тикет. */
export function useSendMessage(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: string) => supportApi.addMessage(ticketId, body),
    onSuccess: (message) => {
      qc.setQueryData<TicketDetail>(ticketKey(ticketId), (old) => (old ? { ...old, messages: [...old.messages, message], updatedAt: message.createdAt } : old))
      void qc.invalidateQueries({ queryKey: ['support', 'list'] })
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      if (e instanceof ApiError && e.status === 409) void qc.invalidateQueries({ queryKey: ticketKey(ticketId) })
    },
  })
}

/** Переоткрытие возвращает тикет целиком (с новым сообщением, если пользователь его написал). */
export function useReopenTicket(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (message?: string) => supportApi.reopen(ticketId, message),
    onSuccess: (ticket) => {
      qc.setQueryData(ticketKey(ticketId), ticket)
      void qc.invalidateQueries({ queryKey: ['support', 'list'] })
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      if (e instanceof ApiError && e.status === 409) void qc.invalidateQueries({ queryKey: ticketKey(ticketId) })
    },
  })
}
