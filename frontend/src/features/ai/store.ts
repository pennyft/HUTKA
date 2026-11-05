import { create } from 'zustand'
import type { ChatEntry } from './types'

interface AiState {
  open: boolean
  entries: ChatEntry[]
  /** Токен, которому принадлежит история: при смене пользователя чат очищается */
  owner: string | null
  setOpen: (open: boolean) => void
  add: (entry: ChatEntry) => void
  update: (id: string, patch: Partial<ChatEntry>) => void
  remove: (id: string) => void
  reset: (owner: string | null) => void
}

/**
 * Состояние помощника живёт в памяти на уровне приложения: чат не пропадает при переходах между страницами и
 * между кабинетами арендатора и партнёра, но не сохраняется на диск (на обновлении страницы он начинается заново).
 */
export const useAiStore = create<AiState>((set) => ({
  open: false,
  entries: [],
  owner: null,
  setOpen: (open) => set({ open }),
  add: (entry) => set((s) => ({ entries: [...s.entries, entry] })),
  update: (id, patch) => set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
  remove: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
  reset: (owner) => set({ open: false, entries: [], owner }),
}))
