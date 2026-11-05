import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router'
import { errorMessage } from '@/api/errors'
import { toast } from '@/shared/ui/toast'
import { aiApi } from './api'
import { MESSAGE_MAX, buildHistory, cabinetFor, entryId, pageContext } from './logic'
import { useAiStore } from './store'
import type { AiCabinet, AiTicketDraft, ChatEntry } from './types'

/**
 * Отправка сообщения помощнику. История берётся из хранилища на момент отправки (без нового вопроса), страница и
 * кабинет из адреса. Статусы unavailable и rate_limited бэк возвращает как обычный ответ (200), и в них всегда есть
 * черновик обращения, поэтому путь к поддержке не теряется. Сетевой сбой показывается репликой с кнопкой «Повторить».
 */
export function useAiSend() {
  const { pathname } = useLocation()
  const mutation = useMutation({
    mutationFn: (v: { message: string; history: ReturnType<typeof buildHistory> }) =>
      aiApi.chat({ message: v.message, page: pageContext(pathname), cabinet: cabinetFor(pathname), history: v.history }),
  })

  async function send(raw: string) {
    const message = raw.trim().slice(0, MESSAGE_MAX)
    if (!message || mutation.isPending) return
    const { add, entries } = useAiStore.getState()
    // история фиксируется ДО добавления нового вопроса: бэк получает вопрос отдельным полем, а не дважды
    const history = buildHistory(entries)
    const promise = mutation.mutateAsync({ message, history })
    add({ id: entryId(), role: 'user', text: message })
    try {
      const res = await promise
      add({
        id: entryId(),
        role: 'assistant',
        text: res.reply,
        status: res.status,
        cars: res.cars?.length ? res.cars : undefined,
        createdTicket: res.createdTicket ?? undefined,
        ticketDraft: res.ticketDraft ?? undefined,
        emergency: res.emergency,
      })
    } catch (e) {
      add({ id: entryId(), role: 'assistant', text: `Не удалось получить ответ. ${errorMessage(e)}`, failed: true, retryText: message })
    }
  }

  /** Повтор после сбоя: убираем сообщение о сбое и сам вопрос, чтобы отправка не задвоила его в истории. */
  function retry(failed: ChatEntry) {
    const { entries, remove } = useAiStore.getState()
    const index = entries.findIndex((e) => e.id === failed.id)
    const question = index > 0 ? entries[index - 1] : undefined
    remove(failed.id)
    if (question && question.role === 'user') remove(question.id)
    void send(failed.retryText ?? '')
  }

  return { send, retry, pending: mutation.isPending }
}

/** Отправка черновика AI как обычного обращения (POST /tickets). После успеха реплика запоминает id обращения. */
export function useSendTicketDraft(entryIdValue: string, cabinet: AiCabinet) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (draft: AiTicketDraft) => aiApi.createTicket(draft, cabinet),
    onSuccess: (ticket) => {
      useAiStore.getState().update(entryIdValue, { ticketSentId: ticket.id })
      qc.invalidateQueries({ queryKey: ['tickets'] })
      toast.success('Обращение отправлено.')
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
}
