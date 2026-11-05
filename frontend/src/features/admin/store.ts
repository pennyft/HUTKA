import { create } from 'zustand'

export interface AdminInfo {
  id: string
  email: string
  displayName: string
}

interface AdminState {
  /** unknown = ещё не проверяли сессию (GET /admin/auth/me при загрузке панели) */
  status: 'unknown' | 'authed' | 'guest'
  admin: AdminInfo | null
  csrfToken: string | null
  setSession: (admin: AdminInfo, csrfToken: string) => void
  setGuest: () => void
}

/** Админ-сессия живёт в cookie JSESSIONID; в памяти держим только csrfToken (его отдаёт login и me). */
export const useAdminStore = create<AdminState>((set) => ({
  status: 'unknown',
  admin: null,
  csrfToken: null,
  setSession: (admin, csrfToken) => set({ status: 'authed', admin, csrfToken }),
  setGuest: () => set({ status: 'guest', admin: null, csrfToken: null }),
}))
