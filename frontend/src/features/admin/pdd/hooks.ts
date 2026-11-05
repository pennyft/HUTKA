import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { toast } from '@/shared/ui/toast'
import { useAdminStore } from '../store'
import { adminPddApi } from './api'
import type { CreatePddBody, UpdatePddBody } from './types'

const useAuthed = () => useAdminStore((s) => s.status === 'authed')

export function usePddList(active: boolean | undefined, page: number) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'pdd', 'list', active ?? 'all', page], queryFn: ({ signal }) => adminPddApi.list(active, page, undefined, signal), enabled: authed, placeholderData: keepPreviousData })
}

/** Сколько вопросов сейчас активно: запрос страницы размера 1 с фильтром active=true, нужен только total. */
export function useActiveCount() {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'pdd', 'active-count'], queryFn: ({ signal }) => adminPddApi.list(true, 0, 1, signal).then((p) => p.total), enabled: authed })
}

export function usePddActions() {
  const qc = useQueryClient()
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'pdd'] })
  const create = useMutation({ mutationFn: (b: CreatePddBody) => adminPddApi.create(b), onSuccess: () => toast.success('Вопрос добавлен.'), onSettled: refresh })
  const update = useMutation({
    mutationFn: (v: { id: string; body: UpdatePddBody }) => adminPddApi.update(v.id, v.body),
    onSuccess: () => toast.success('Вопрос обновлён.'),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: refresh,
  })
  const remove = useMutation({ mutationFn: (id: string) => adminPddApi.remove(id), onSuccess: () => toast.success('Вопрос удалён.'), onError: (e) => toast.error(errorMessage(e)), onSettled: refresh })
  return { create, update, remove }
}
