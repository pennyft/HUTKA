import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '@/api/errors'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ADMIN_PAGE_SIZE } from '../api'
import { ExportButton } from '../components/ExportButton'
import { FinanceTabs } from '../components/FinanceTabs'
import { Pager } from '../components/Pager'
import { PeriodPicker } from '../components/PeriodPicker'
import { useCommissions } from '../finance/hooks'
import { parsePeriod, percentLabel, periodProblem, periodToParams } from '../finance/logic'

/**
 * AD13. История комиссий: по каким броням, с какой суммы и по какому проценту удержано. GET /admin/finance/commissions?from&to
 * (по умолчанию с начала текущего месяца). Процент хранится в каждой записи, поэтому смена настройки старые записи не меняет.
 */
export default function AdminCommissionsPage() {
  const [sp, setSp] = useSearchParams()
  const period = parsePeriod(sp)
  const pageParam = Number(sp.get('page'))
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam - 1 : 0
  const list = useCommissions(periodProblem(period) ? { from: '', to: '' } : period, page)
  const items = list.data?.items ?? []
  const setPage = (p: number) => setSp({ ...periodToParams(period), ...(p > 0 ? { page: String(p + 1) } : {}) }, { replace: true })

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-10 pt-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Комиссии</h1>
        <div className="mt-3">
          <FinanceTabs />
        </div>
      </div>
      <PeriodPicker value={period} onChange={(p) => setSp(periodToParams(p), { replace: true })} />

      {list.isPending ? (
        <Skeleton className="h-64 rounded-3xl" aria-hidden />
      ) : list.isError ? (
        <div className="rounded-3xl border border-line bg-surface p-8">
          <h2 className="text-lg font-bold text-fg">Не удалось загрузить комиссии</h2>
          <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
          <div className="mt-5">
            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
              Повторить
            </Button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-3xl border border-line bg-surface p-8 text-sm text-muted">За этот период комиссий нет.</p>
      ) : (
        <div>
          <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Списано</th>
                  <th className="px-4 py-3 font-medium">Бронь</th>
                  <th className="px-4 py-3 text-right font-medium">Сумма</th>
                  <th className="px-4 py-3 text-right font-medium">Процент</th>
                  <th className="px-4 py-3 text-right font-medium">Комиссия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((c) => (
                  <tr key={c.bookingId} className="transition-colors hover:bg-surface-2">
                    <td className="px-4 py-3 text-xs text-muted">{formatDateTime(c.chargedAt)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/bookings/${c.bookingId}`} className="font-mono text-xs font-semibold text-fg hover:underline">
                        {c.bookingId.slice(0, 8)}
                      </Link>
                      <Link to={`/admin/users/${c.partnerId}`} className="ml-3 text-xs text-muted underline hover:text-fg">
                        партнёр
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right">{formatMoney(c.amount)}</td>
                    <td className="px-4 py-3 text-right text-muted">{percentLabel(c.commissionPercent)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-fg">{formatMoney(c.commissionAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} size={ADMIN_PAGE_SIZE} total={list.data?.total ?? 0} onPage={setPage} />
        </div>
      )}
      <ExportButton kind="commissions" period={period} />
    </div>
  )
}
