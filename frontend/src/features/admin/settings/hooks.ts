import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminHttp } from '@/api/adminHttp'
import { toast } from '@/shared/ui/toast'
import { useAdminStore } from '../store'
import type { SettingsBody } from './logic'

export interface AdminSettings {
  commissionPercent: number
  minRatingThreshold: number
  minRatingsCount: number
  updatedAt: string | null
  updatedByAdminId: string | null
}

const KEY = ['admin', 'settings'] as const

/** GET /admin/settings и PATCH /admin/settings (меняются только переданные поля). Управления городами и лимитами в API нет. */
export function useSettings() {
  const authed = useAdminStore((s) => s.status === 'authed')
  return useQuery({ queryKey: KEY, queryFn: ({ signal }) => adminHttp.request<AdminSettings>('/admin/settings', { signal }), enabled: authed })
}

export function useSaveSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: SettingsBody) => adminHttp.request<AdminSettings>('/admin/settings', { method: 'PATCH', body }),
    onSuccess: (saved) => {
      qc.setQueryData(KEY, saved)
      toast.success('Настройки сохранены.')
    },
  })
}
