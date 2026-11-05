import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { errorMessage } from '@/api/errors'
import { toast } from '@/shared/ui/toast'
import { pddApi } from './api'
import { usePddSessionStore } from './session'

export const PDD_HISTORY_KEY = ['pdd', 'history'] as const

/** Цикл, активная скидка и история. Запрос безопасный: попытку он не создаёт. */
export function usePddHistory() {
  return useQuery({ queryKey: PDD_HISTORY_KEY, queryFn: ({ signal }) => pddApi.history(signal) })
}

/**
 * Кнопка «Начать» / «Продолжить»: GET /pddtest/questions (создаёт попытку или возвращает идущую), затем переход на тест.
 * При 409 (попытки закончились, мало вопросов) показываем текст бэка и перечитываем историю.
 */
export function useStartPdd() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: pddApi.start,
    onSuccess: (session) => {
      usePddSessionStore.getState().set(session)
      navigate('/app/pdd/test')
    },
    onError: (e) => {
      toast.error(errorMessage(e))
      void qc.invalidateQueries({ queryKey: PDD_HISTORY_KEY })
    },
  })
}

/** Отправка ответов. После неё история всегда перечитывается: изменились попытки, цикл и скидка. */
export function useSubmitPdd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: pddApi.submit,
    onSettled: () => qc.invalidateQueries({ queryKey: ['pdd'] }),
  })
}
