import { useMemo } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '@/api/errors'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useBankDetails, usePartnerPayouts } from '../hooks'
import { PAYOUT_STATUS_LABEL, periodText } from '../payoutsLogic'

/**
 * P9. Выплаты: баланс до следующей выплаты, ожидающая сумма, дата следующей выплаты и история. Выплаты собираются раз в неделю
 * (по умолчанию понедельник 03:00 по Минску, значение настраивается на бэке). Без реквизитов (P11) деньги некуда перечислять.
 */
export default function PartnerPayoutsPage() {
    const list = usePartnerPayouts()
    const bank = useBankDetails()
    const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data])
    const head = list.data?.pages[0]
    const cur = head?.currency ?? 'BYN'

    return (
        <div className="mx-auto max-w-2xl space-y-5 px-4 pb-10 pt-6">
            <header>
                <h1 className="text-2xl font-bold tracking-tight text-fg">Выплаты</h1>
                <p className="mt-1 text-sm text-muted">Доход по завершённым поездкам собирается в выплату раз в неделю.</p>
            </header>

            {bank.data && !bank.data.present && (
                <div role="status" className="rounded-3xl border border-danger/40 bg-surface p-4">
                    <p className="text-sm text-fg">Реквизиты для выплат не заданы: деньги некуда перечислять.</p>
                    <Link to="/partner/payout-details" className="mt-1 inline-block text-sm font-semibold text-fg underline hover:opacity-80">
                        Указать реквизиты
                    </Link>
                </div>
            )}

            {list.isPending ? (
                <div className="space-y-3" aria-hidden>
                    <Skeleton className="h-24 rounded-3xl" />
                    <Skeleton className="h-40 rounded-3xl" />
                </div>
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
            ) : (
                head && (
                    <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            <div className="rounded-3xl border border-line bg-surface p-4">
                                <p className="text-xs text-muted">Баланс до выплаты</p>
                                <p className="mt-1 text-xl font-bold text-fg">{formatMoney(head.balance, cur)}</p>
                            </div>
                            <div className="rounded-3xl border border-line bg-surface p-4">
                                <p className="text-xs text-muted">Ожидает перечисления</p>
                                <p className="mt-1 text-xl font-bold text-fg">{formatMoney(head.pendingAmount, cur)}</p>
                            </div>
                            <div className="col-span-2 rounded-3xl border border-line bg-surface p-4 sm:col-span-1">
                                <p className="text-xs text-muted">Следующая выплата</p>
                                <p className="mt-1 text-xl font-bold text-fg">{head.nextPayoutAt ? formatDateTime(head.nextPayoutAt) : '—'}</p>
                            </div>
                        </div>

                        <section aria-labelledby="payout-history">
                            <div className="mb-2 flex items-baseline justify-between">
                                <h2 id="payout-history" className="text-lg font-bold text-fg">
                                    История выплат
                                </h2>
                                <Link to="/partner/payout-details" className="text-sm text-muted underline hover:text-fg">
                                    Реквизиты
                                </Link>
                            </div>
                            {items.length === 0 ? (
                                <p className="rounded-3xl border border-line bg-surface p-6 text-sm text-muted">Выплат пока не было.</p>
                            ) : (
                                <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                                    {items.map((p) => (
                                        <li key={p.id}>
                                            <Link to={`/partner/payouts/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2">
                        <span className="min-w-0">
                          <span className="block font-semibold text-fg">{periodText(p.periodStart, p.periodEnd)}</span>
                          <span className="text-xs text-muted">
                            {PAYOUT_STATUS_LABEL[p.status]}
                              {p.paidAt && <> · {formatDateTime(p.paidAt)}</>}
                          </span>
                        </span>
                                                <span className="shrink-0 font-bold text-fg">{formatMoney(p.amount, p.currency)}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {list.hasNextPage && (
                                <div className="mt-5 flex justify-center">
                                    <Button variant="outline" loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()} className="sm:w-auto sm:px-8">
                                        Показать ещё
                                    </Button>
                                </div>
                            )}
                        </section>
                    </>
                )
            )}
        </div>
    )
}