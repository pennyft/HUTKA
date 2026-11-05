import { create } from 'zustand'

const KEY = 'hutka.token'

function read(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

interface AuthState {
  token: string | null
  setToken: (token: string) => void
  /** Выход: клиентского logout-эндпоинта у бэка нет, достаточно удалить токен (сокет закрывается в SocketBridge). */
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: read(),
  setToken: (token) => {
    try {
      localStorage.setItem(KEY, token)
    } catch {
      // хранилище недоступно: токен живёт только в памяти
    }
    set({ token })
  },
  clear: () => {
    try {
      localStorage.removeItem(KEY)
    } catch {
      // игнорируем
    }
    set({ token: null })
  },
}))
