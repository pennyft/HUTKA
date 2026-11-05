import { create } from 'zustand'

type Kind = 'error' | 'success'

interface ToastState {
  message: string | null
  kind: Kind
  show: (message: string, kind?: Kind) => void
  hide: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined

/** Глобальное уведомление сверху. Вызов: useToastStore.getState().show('Текст') или toast.error('Текст'). */
export const useToastStore = create<ToastState>((set) => ({
  message: null,
  kind: 'error',
  show: (message, kind = 'error') => {
    clearTimeout(timer)
    set({ message, kind })
    timer = setTimeout(() => set({ message: null }), 5000)
  },
  hide: () => {
    clearTimeout(timer)
    set({ message: null })
  },
}))

export const toast = {
  error: (m: string) => useToastStore.getState().show(m, 'error'),
  success: (m: string) => useToastStore.getState().show(m, 'success'),
}
