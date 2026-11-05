import { Link, useSearchParams } from 'react-router'
import { Scale } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ADMIN_PAGE_SIZE } from '../api'
import { BOOKING_STATUS_LABEL } from '../bookings/logic'
import { Pager } from '../components/Pager'
import { Pill } from '../components/Pills'
import { useAdminDisputes } from '../disputes/hooks'
import { DECISION_LABEL, DISPUTE_TABS, parseDisputeTab } from '../disputes/logic'

/**
 * AD10. Споры: вкладки «Открытые» (старые первыми, их нужно решить) и «Решённые» (новые первыми). GET /admin/disputes?status=.
 * Спор создаёт система, когда возврат просрочен больше чем на 3 часа: вручную его открыть нельзя.
 */
export default function AdminDisputesPage() {
    const [sp, setSp] = useSearchParams()
    const tab = parseDisputeTab(sp.get('tab') ?? sp.get('status'))
    const pageParam = Number(sp.get('page'))
    const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam - 1 : 0
    const list = useAdminDisputes(tab, page)
    const items = list.data?.items ?? []
    const go = (t: string, p = 0) => setSp({ ...(t === 'open' ? {} : { tab: t }), ...(p > 0 ? { page: String(p + 1) } : {}) }, { replace: true })

    return (
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Споры</h1>

            <div role="group" aria-label="Список споров" className="mt-4 flex gap-2">
                {DISPUTE_TABS.map((t) => (
                    <button
                        key={t.value}
                        type="button"
                        aria-pressed={tab === t.value}
                        onClick={() => go(t.value)}
                        className={`h-9 rounded-full border px-3.5 text-sm transition-colors ${tab === t.value ? 'border-primary bg-accent font-medium text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            <div className="mt-4">
                {list.isPending ? (
                    <div className="space-y-3" aria-hidden>
                        {Array.from({ length: 3 }, (_, i) => (
                            <Skeleton key={i} className="h-24 rounded-3xl" />
                        ))}
                    </div>
                ) : list.isError ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Не удалось загрузить споры</h2>
                        <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
                        <div className="mt-5">
                            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <Scale className="mb-3 size-6 text-muted" aria-hidden />
                        <h2 className="text-lg font-bold text-fg">{tab === 'open' ? 'Открытых споров нет' : 'Решённых споров пока нет'}</h2>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-3">
                            {items.map((d) => (
                                <li key={d.id}>
                                    <Link to={`/admin/disputes/${d.id}`} className="block rounded-3xl border border-line bg-surface p-4 transition-colors hover:bg-surface-2">
                                        <div className="flex flex-wrap items-start justify-between gap-2">
                                            <p className="font-semibold text-fg">{d.car ?? 'Автомобиль'}</p>
                                            <span className="flex flex-wrap gap-1.5">
                        <Pill>{BOOKING_STATUS_LABEL[d.bookingStatus]}</Pill>
                                                {d.decision && <Pill>{DECISION_LABEL[d.decision]}</Pill>}
                      </span>
                                        </div>
                                        <p className="mt-1 text-sm text-muted">
                                            Арендатор: {d.renterName ?? '—'} · Партнёр: {d.partnerName ?? '—'}
                                        </p>
                                        <p className="mt-1 text-xs text-muted">
                                            Открыт {formatDateTime(d.createdAt)} · вернуть нужно было до {formatDateTime(d.plannedEndAt)}
                                            {d.resolvedAt && <> · решён {formatDateTime(d.resolvedAt)}</>}
                                            {d.decision === 'partner_favor' && d.damageAmount !== null && <> · ущерб {formatMoney(d.damageAmount)}</>}
                                        </p>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <Pager page={page} size={ADMIN_PAGE_SIZE} total={list.data?.total ?? 0} onPage={(p) => go(tab, p)} />
                    </>
                )}
            </div>
        </div>
    )
}