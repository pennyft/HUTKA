import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import type { PayoutStatus } from '@/features/partner/types'
import { toast } from '@/shared/ui/toast'
import { useAdminStore } from '../store'
import { financeApi } from './api'
import { exportFileName, periodToQuery } from './logic'
import type { ExportKind, Period } from './types'

const useAuthed = () => useAdminStore((s) => s.status === 'authed')

export function useFinanceSummary(p: Period) {
  const authed = useAuthed()
  const q = periodToQuery(p)
  return useQuery({ queryKey: ['admin', 'finance', 'summary', q], queryFn: ({ signal }) => financeApi.summary(q, signal), enabled: authed, staleTime: 30_000 })
}

export function useCommissions(p: Period, page: number) {
  const authed = useAuthed()
  const q = periodToQuery(p)
  return useQuery({ queryKey: ['admin', 'finance', 'commissions', q, page], queryFn: ({ signal }) => financeApi.commissions(q, page, signal), enabled: authed, placeholderData: keepPreviousData })
}

export function useAdminPayouts(status: PayoutStatus | undefined, page: number) {
  const authed = useAuthed()
  return useQuery({ queryKey: ['admin', 'finance', 'payouts', status ?? 'all', page], queryFn: ({ signal }) => financeApi.payouts(status, page, signal), enabled: authed, placeholderData: keepPreviousData })
}

/** Скачивание CSV за период: через Blob (запрос идёт с cookie сессии, обычная ссылка не подойдёт). Ошибка бэка (в том числе потолок строк) показывается текстом. */
export function useExportCsv(kind: ExportKind, p: Period) {
  return useMutation({
    mutationFn: () => financeApi.exportCsv(kind, periodToQuery(p)),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = exportFileName(kind, p, new Date())
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    },
    onError: (e) => toast.error(errorMessage(e)),
  })
}
