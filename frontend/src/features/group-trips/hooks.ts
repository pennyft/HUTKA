import { useEffect, useRef, useState } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { toast } from '@/shared/ui/toast'
import { hub } from '@/shared/ws/stompHub'
import { useSocketStatus } from '@/shared/ws/useSocketStatus'
import { CHAT_PAGE_SIZE, groupTripsApi } from './api'
import { MESSAGE_MAX } from './rules'
import { parseChatError, parseChatMessage, prependLive } from './messages'
import type { TripDetail, TripStatus } from './types'

/** Список поездок постранично. total есть в ответе, поэтому следующая страница определяется точно. */
export function useTripList(opts: { mine: boolean; status?: TripStatus }) {
  return useInfiniteQuery({
    queryKey: ['group-trips', 'list', opts.mine, opts.status],
    queryFn: ({ pageParam, signal }) => groupTripsApi.list({ ...opts, page: pageParam }, signal),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0)
      return last.items.length > 0 && loaded < last.total ? all.length : undefined
    },
  })
}

export function useTrip(id: string) {
  return useQuery({ queryKey: ['group-trips', 'detail', id], queryFn: ({ signal }) => groupTripsApi.details(id, signal), enabled: !!id })
}

/** Общая часть мутаций: свежая карточка поездки в кэш, списки перечитать, тост об успехе, текст ошибки бэка в тост. */
function useTripMutation(fn: (id: string) => Promise<TripDetail>, successText: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (trip) => {
      qc.setQueryData(['group-trips', 'detail', trip.id], trip)
      qc.invalidateQueries({ queryKey: ['group-trips', 'list'] })
      toast.success(successText)
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
}

export const useJoinTrip = () => useTripMutation(groupTripsApi.join, 'Вы присоединились к поездке.')
export const useCloseTrip = () => useTripMutation(groupTripsApi.close, 'Набор участников закрыт.')
export const useCancelTrip = () => useTripMutation(groupTripsApi.cancel, 'Поездка отменена.')

/**
 * Чат поездки: история постранично (новые первыми) + сообщения в реальном времени по общему сокету.
 * Сообщение уходит STOMP SEND на /app/group-trips/{id}/chat, а появляется в ленте, когда сервер вернёт его в
 * /user/queue/group-trips/{id}/chat (отправитель получает своё сообщение тоже: так порядок и подтверждение всегда
 * серверные). Ошибки отправки приходят в /user/queue/errors. После каждого (пере)подключения история перечитывается,
 * чтобы не потерять сообщения, пришедшие, пока связи не было.
 */
export function useTripChat(tripId: string) {
  const qc = useQueryClient()
  const status = useSocketStatus()
  const [error, setError] = useState<string | null>(null)
  const key = ['group-trips', 'messages', tripId] as const

  const history = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam, signal }) => groupTripsApi.messages(tripId, pageParam, signal),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.items.length, 0)
      return last.items.length > 0 && loaded < last.total ? all.length : undefined
    },
  })

  useEffect(() => {
    const offChat = hub.subscribe(`/user/queue/group-trips/${tripId}/chat`, (body) => {
      const msg = parseChatMessage(body)
      if (msg) qc.setQueryData(['group-trips', 'messages', tripId], (old: Parameters<typeof prependLive>[0]) => prependLive(old, msg))
    })
    const offErrors = hub.subscribe('/user/queue/errors', (body) => setError(parseChatError(body)))
    return () => {
      offChat()
      offErrors()
    }
  }, [tripId, qc])

  // После (пере)подключения перечитываем историю, но не дублируем запрос, если она как раз грузится
  const { refetch, fetchStatus } = history
  useEffect(() => {
    if (status === 'connected' && fetchStatus !== 'fetching') void refetch()
  }, [status, refetch]) // eslint-disable-line react-hooks/exhaustive-deps -- fetchStatus читаем в момент подключения, а не как триггер

  // Ошибка отправки исчезает сама через несколько секунд
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    if (!error) return
    timer.current = setTimeout(() => setError(null), 8000)
    return () => clearTimeout(timer.current)
  }, [error])

  /** true, если кадр отправлен. Пустой текст и превышение длины отсекаем сразу (то же проверит и бэк). */
  function send(raw: string): boolean {
    const body = raw.trim()
    if (!body) return false
    if (body.length > MESSAGE_MAX) {
      setError(`Сообщение не может быть длиннее ${MESSAGE_MAX} символов`)
      return false
    }
    setError(null)
    const ok = hub.publish(`/app/group-trips/${tripId}/chat`, JSON.stringify({ body }))
    if (!ok) setError('Нет соединения с чатом. Подождите переподключения и повторите.')
    return ok
  }

  return { history, status, error, send, pageSize: CHAT_PAGE_SIZE }
}
