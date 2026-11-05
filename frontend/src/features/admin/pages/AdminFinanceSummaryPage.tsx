import { useSearchParams } from 'react-router'
import { TriangleAlert } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ExportButton } from '../components/ExportButton'
import { FinanceTabs } from '../components/FinanceTabs'
import { PeriodPicker } from '../components/PeriodPicker'
import { useFinanceSummary } from '../finance/hooks'
import { parsePeriod, periodProblem, periodToParams } from '../finance/logic'

function Tile({ label, value, note, warn }: { label: string; value: string; note?: string; warn?: boolean }) {
  return (
    <div className={`rounded-3xl border bg-surface p-4 ${warn ? 'border-danger/50' : 'border-line'}`}>
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${warn ? 'text-danger' : 'text-fg'}`}>{value}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
    </div>
  )
}

/**
 * AD12. Финансы, сводка: платежи, комиссия платформы, заработок партнёров, неуспешные списания, выплачено за всё время и ожидает выплаты
 * сейчас. GET /admin/finance/summary?from&to. По умолчанию с начала текущего месяца до сейчас. Неуспешные списания выделены:
 * ручного повтора списания в API нет. Период хранится в адресе.
 */
export default function AdminFinanceSummaryPage() {
  const [sp, setSp] = useSearchParams()
  const period = parsePeriod(sp)
  const blocked = !!periodProblem(period)
  const { data, isPending, isError, error, refetch } = useFinanceSummary(blocked ? { from: '', to: '' } : period)

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-10 pt-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Финансы</h1>
        <div className="mt-3">
          <FinanceTabs />
        </div>
      </div>

      <PeriodPicker value={period} onChange={(p) => setSp(periodToParams(p), { replace: true })} />

      {isPending ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-3xl border border-line bg-surface p-8">
          <h2 className="text-lg font-bold text-fg">Не удалось загрузить сводку</h2>
          <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
          <div className="mt-5">
            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
              Повторить
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">
            Период: {formatDateTime(data.from)} — {formatDateTime(data.to)} (конец не включается)
          </p>
          {data.failedCharges > 0 && (
            <p role="alert" className="flex items-start gap-2 rounded-2xl border border-danger/50 bg-surface p-3 text-sm text-fg">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
              <span>Неуспешных списаний за период: {data.failedCharges}. Повторить списание из админки нельзя: система повторяет попытки сама, остальное решается вручную.</span>
            </p>
          )}
          <section aria-label="Показатели периода" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <Tile label="Платежей" value={String(data.paymentsCount)} />
            <Tile label="Списано с арендаторов" value={formatMoney(data.totalCharged, data.currency)} />
            <Tile label="Комиссия платформы" value={formatMoney(data.platformCommission, data.currency)} />
            <Tile label="Заработок партнёров" value={formatMoney(data.partnerEarnings, data.currency)} />
            <Tile label="Неуспешные списания" value={String(data.failedCharges)} warn={data.failedCharges > 0} />
          </section>
          <section aria-label="Выплаты партнёрам" className="grid gap-3 sm:grid-cols-2">
            <Tile label="Выплачено партнёрам за всё время" value={formatMoney(data.paidOutAllTime, data.currency)} note="не зависит от периода" />
            <Tile label="Ожидает выплаты сейчас" value={formatMoney(data.awaitingPayoutNow, data.currency)} note="баланс и выплаты в ожидании" />
          </section>
          <ExportButton kind="commissions" period={period} />
        </>
      )}
    </div>
  )
}
