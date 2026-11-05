import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '@/api/errors'
import { PAYOUT_STATUS_LABEL, periodText } from '@/features/partner/payoutsLogic'
import type { PayoutStatus } from '@/features/partner/types'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ADMIN_PAGE_SIZE } from '../api'
import { ExportButton } from '../components/ExportButton'
import { FinanceTabs } from '../components/FinanceTabs'
import { Pager } from '../components/Pager'
import { Pill } from '../components/Pills'
import { PeriodPicker } from '../components/PeriodPicker'
import { useAdminPayouts } from '../finance/hooks'
import { parsePeriod, periodToParams } from '../finance/logic'

const FILTERS: { value: '' | PayoutStatus; label: string }[] = [
  { value: '', label: 'Все' },
  { value: 'pending', label: 'Ожидают' },
  { value: 'paid', label: 'Выплачены' },
]

/**
 * AD14. Выплаты партнёрам: GET /admin/finance/payouts?status=pending|paid. Период в списке не применяется (список по статусу и страницам),
 * он нужен только выгрузке CSV (AD15): в файл попадают выплаты, созданные за выбранный период.
 */
export default function AdminPayoutsPage() {
  const [sp, setSp] = useSearchParams()
  const st = sp.get('status')
  const status: '' | PayoutStatus = st === 'pending' || st === 'paid' ? st : ''
  const pageParam = Number(sp.get('page'))
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam - 1 : 0
  const period = parsePeriod(sp)
  const list = useAdminPayouts(status || undefined, page)
  const items = list.data?.items ?? []
  const write = (s: string, p: number, per = period) => setSp({ ...(s ? { status: s } : {}), ...(p > 0 ? { page: String(p + 1) } : {}), ...periodToParams(per) }, { replace: true })

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-10 pt-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Выплаты партнёрам</h1>
        <div className="mt-3">
          <FinanceTabs />
        </div>
      </div>

      <div role="group" aria-label="Статус выплат" className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={status === f.value}
            onClick={() => write(f.value, 0)}
            className={`h-9 rounded-full border px-3.5 text-sm transition-colors ${status === f.value ? 'border-primary bg-accent font-medium text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {list.isPending ? (
        <Skeleton className="h-64 rounded-3xl" aria-hidden />
      ) : list.isError ? (
        <div className="rounded-3xl border border-line bg-surface p-8">
          <h2 className="text-lg font-bold text-fg">Не удалось загрузить выплаты</h2>
          <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
          <div className="mt-5">
            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
              Повторить
            </Button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-3xl border border-line bg-surface p-8 text-sm text-muted">Выплат нет.</p>
      ) : (
        <div>
          <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-line text-xs text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Период</th>
                  <th className="px-4 py-3 font-medium">Партнёр</th>
                  <th className="px-4 py-3 font-medium">Статус</th>
                  <th className="px-4 py-3 text-right font-medium">Сумма</th>
                  <th className="px-4 py-3 text-right font-medium">Комиссия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-4 py-3 font-medium text-fg">{periodText(p.periodStart, p.periodEnd)}</td>
                    <td className="px-4 py-3">
                      <Link to={`/admin/users/${p.partnerId}`} className="text-muted underline hover:text-fg">
                        профиль
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Pill>{PAYOUT_STATUS_LABEL[p.status]}</Pill>
                      {p.paidAt && <span className="ml-2 text-xs text-muted">{formatDateTime(p.paidAt)}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-fg">{formatMoney(p.amount, p.currency)}</td>
                    <td className="px-4 py-3 text-right text-muted">{formatMoney(p.commissionDeducted, p.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} size={ADMIN_PAGE_SIZE} total={list.data?.total ?? 0} onPage={(p) => write(status, p)} />
        </div>
      )}

      <section aria-labelledby="export-title" className="space-y-3">
        <h2 id="export-title" className="font-bold text-fg">
          Выгрузка CSV
        </h2>
        <PeriodPicker value={period} onChange={(per) => write(status, page, per)} />
        <ExportButton kind="payouts" period={period} />
      </section>
    </div>
  )
}
