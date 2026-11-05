import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { toast } from '@/shared/ui/toast'
import { useAdminStore } from '../store'
import { carsApi } from './api'
import type { CarTab } from './types'

const useAuthed = () => useAdminStore((s) => s.status === 'authed')

export function useAdminCars(tab: CarTab, page: number) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'cars', tab, page], queryFn: ({ signal }) => carsApi.list(tab, page, signal), enabled: authed, placeholderData: keepPreviousData })
}

export function useAdminCar(id: string) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'car', id], queryFn: ({ signal }) => carsApi.get(id, signal), enabled: authed && !!id })
}

/** Действие над машиной: тост с успехом или текстом 409 от бэка, затем обновление списков, карточки и счётчика очереди в меню. */
function useAction<V>(fn: (v: V) => Promise<unknown>, ok: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => toast.success(ok),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin'] })
      void qc.invalidateQueries({ queryKey: ['nav', 'admin-queues'] })
    },
  })
}

export function useCarModeration() {
  return {
    approve: useAction((id: string) => carsApi.approve(id), 'Машина одобрена, партнёр получил уведомление.'),
    reject: useAction((v: { id: string; reason: string }) => carsApi.reject(v.id, v.reason), 'Заявка отклонена, партнёр получит причину.'),
    hide: useAction((v: { id: string; reason: string }) => carsApi.hide(v.id, v.reason), 'Машина скрыта из каталога.'),
    unhide: useAction((id: string) => carsApi.unhide(id), 'Скрытие администратором снято.'),
    returnToCatalog: useAction((id: string) => carsApi.returnToCatalog(id), 'Машина возвращена в каталог, страйки сброшены.'),
    remove: useAction((id: string) => carsApi.remove(id), 'Машина удалена.'),
  }
}
