import { Link, useSearchParams } from 'react-router'
import { LifeBuoy } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { useNow } from '@/features/bookings/useNow'
import { CATEGORY_LABEL, CATEGORY_ORDER } from '@/features/support/labels'
import { SelectField } from '@/features/support/components/FormFields'
import { formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ADMIN_PAGE_SIZE } from '../api'
import { Pager } from '../components/Pager'
import { Pill } from '../components/Pills'
import { useAdminTickets, useTicketStats } from '../tickets/hooks'
import { AUDIENCE_LABEL, AUDIENCES, durationText, parseTicketFilters, ticketFiltersToParams, ticketFiltersToQuery, waitingText } from '../tickets/logic'
import type { TicketFilters } from '../tickets/types'

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold ${warn ? 'text-danger' : 'text-fg'}`}>{value}</p>
    </div>
  )
}

/**
 * AD16. Тикеты: статистика (открытые, срочные, ждут ответа, время первого ответа за 30 дней) и очередь. Открытые: сначала срочные,
 * затем те, кто дольше ждёт ответа. Закрытые: недавно закрытые первыми. GET /admin/tickets и /admin/tickets/stats. Фильтры хранятся в адресе.
 */
export default function AdminTicketsPage() {
  const [sp, setSp] = useSearchParams()
  const f = parseTicketFilters(sp)
  const now = useNow(60_000)
  const stats = useTicketStats()
  const list = useAdminTickets(ticketFiltersToQuery(f))
  const items = list.data?.items ?? []
  const update = (patch: Partial<TicketFilters>) => setSp(ticketFiltersToParams({ ...f, page: 0, ...patch }), { replace: true })

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-10 pt-6">
      <h1 className="text-2xl font-bold tracking-tight text-fg">Обращения</h1>

      {stats.data && (
        <section aria-label="Статистика поддержки" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Stat label="Открыто" value={String(stats.data.openTotal)} />
          <Stat label="Из них срочных" value={String(stats.data.openUrgent)} warn={stats.data.openUrgent > 0} />
          <Stat label="Ждут ответа" value={String(stats.data.awaitingAnswer)} warn={stats.data.awaitingAnswer > 0} />
          <Stat label={`Среднее время первого ответа (${stats.data.windowDays} дн.)`} value={durationText(stats.data.avgFirstResponseSeconds)} />
          <Stat label="Медианное время первого ответа" value={durationText(stats.data.medianFirstResponseSeconds)} />
          <Stat label="Отвечено за период" value={String(stats.data.answeredInWindow)} />
        </section>
      )}

      <div role="group" aria-label="Список обращений" className="flex gap-2">
        {(['open', 'closed'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={f.tab === t}
            onClick={() => update({ tab: t })}
            className={`h-9 rounded-full border px-3.5 text-sm transition-colors ${f.tab === t ? 'border-primary bg-accent font-medium text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
          >
            {t === 'open' ? 'Открытые' : 'Закрытые'}
          </button>
        ))}
      </div>

      <div className="grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-3">
        <SelectField label="Приоритет" value={f.priority} onChange={(e) => update({ priority: e.target.value as TicketFilters['priority'] })}>
          <option value="">Любой</option>
          <option value="urgent">Срочные</option>
          <option value="normal">Обычные</option>
        </SelectField>
        <SelectField label="Категория" value={f.category} onChange={(e) => update({ category: e.target.value as TicketFilters['category'] })}>
          <option value="">Любая</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Откуда" value={f.audience} onChange={(e) => update({ audience: e.target.value as TicketFilters['audience'] })}>
          <option value="">Все</option>
          {AUDIENCES.map((a) => (
            <option key={a} value={a}>
              {AUDIENCE_LABEL[a]}
            </option>
          ))}
        </SelectField>
      </div>

      {list.isPending ? (
        <div className="space-y-2" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20 rounded-3xl" />
          ))}
        </div>
      ) : list.isError ? (
        <div className="rounded-3xl border border-line bg-surface p-8">
          <h2 className="text-lg font-bold text-fg">Не удалось загрузить обращения</h2>
          <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
          <div className="mt-5">
            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
              Повторить
            </Button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-8">
          <LifeBuoy className="mb-3 size-6 text-muted" aria-hidden />
          <h2 className="text-lg font-bold text-fg">{f.tab === 'open' ? 'Открытых обращений нет' : 'Закрытых обращений нет'}</h2>
        </div>
      ) : (
        <div>
          <ul className="space-y-3">
            {items.map((t) => {
              const waiting = waitingText(t.awaitingAdminSince, now)
              return (
                <li key={t.id}>
                  <Link to={`/admin/tickets/${t.id}`} className="block rounded-3xl border border-line bg-surface p-4 transition-colors hover:bg-surface-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="min-w-0 break-words font-semibold text-fg">{t.subject}</p>
                      <span className="flex flex-wrap gap-1.5">
                        {t.priority === 'urgent' && <Pill warn>Срочное</Pill>}
                        <Pill>{CATEGORY_LABEL[t.category]}</Pill>
                        <Pill>{AUDIENCE_LABEL[t.audience]}</Pill>
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted">{t.requesterName ?? (t.audience === 'system' ? 'Системное обращение' : 'Автор неизвестен')}</p>
                    <p className="mt-1 text-xs text-muted">
                      создано {formatDateTime(t.createdAt)}
                      {waiting && <span className="font-medium text-danger"> · {waiting}</span>}
                      {t.closedAt && <> · закрыто {formatDateTime(t.closedAt)}</>}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
          <Pager page={f.page} size={ADMIN_PAGE_SIZE} total={list.data?.total ?? 0} onPage={(p) => update({ page: p })} />
        </div>
      )}
    </div>
  )
}
