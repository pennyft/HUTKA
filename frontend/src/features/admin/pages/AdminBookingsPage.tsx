import { Link, useSearchParams } from 'react-router'
import { X } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { formatPeriod } from '@/features/bookings/period'
import { SelectField } from '@/features/support/components/FormFields'
import { formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ADMIN_PAGE_SIZE } from '../api'
import { useAdminBookings } from '../bookings/hooks'
import { BOOKING_STATUS_LABEL, bookingFiltersToParams, bookingFiltersToQuery, parseBookingFilters, shortId } from '../bookings/logic'
import type { BookingFilters } from '../bookings/types'
import { Pager } from '../components/Pager'
import { Pill } from '../components/Pills'

/**
 * AD8. Брони платформы: GET /admin/bookings с фильтрами по статусу, периоду (по времени начала), машине, арендатору и «участнику»
 * (userId: арендатор или владелец машины). Фильтры по машине и пользователю приходят ссылками из карточек (?carId=, ?userId=) и
 * показываются сбрасываемыми метками. Всё хранится в адресе.
 */
export default function AdminBookingsPage() {
    const [sp, setSp] = useSearchParams()
    const f = parseBookingFilters(sp)
    const list = useAdminBookings(bookingFiltersToQuery(f))
    const items = list.data?.items ?? []
    const update = (patch: Partial<BookingFilters>) => setSp(bookingFiltersToParams({ ...f, page: 0, ...patch }), { replace: true })
    const idChips = (
        [
            ['carId', 'Машина'],
            ['renterId', 'Арендатор'],
            ['userId', 'Участник'],
        ] as const
    ).filter(([k]) => f[k])

    return (
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Брони</h1>

            {idChips.length > 0 && (
                <p className="mt-3 flex flex-wrap gap-2">
                    {idChips.map(([k, label]) => (
                        <button key={k} type="button" onClick={() => update({ [k]: '' })} className="inline-flex items-center gap-1.5 rounded-full border border-primary bg-accent px-3 py-1 text-sm text-accent-fg">
                            {label}: {shortId(f[k])}
                            <X className="size-3.5" aria-label="Убрать фильтр" />
                        </button>
                    ))}
                </p>
            )}

            <div className="mt-4 grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-4">
                <SelectField label="Статус" value={f.status} onChange={(e) => update({ status: e.target.value as BookingFilters['status'] })}>
                    <option value="">Все статусы</option>
                    {(Object.keys(BOOKING_STATUS_LABEL) as (keyof typeof BOOKING_STATUS_LABEL)[]).map((s) => (
                        <option key={s} value={s}>
                            {BOOKING_STATUS_LABEL[s]}
                        </option>
                    ))}
                </SelectField>
                <TextField label="Начало с" type="date" value={f.from} onChange={(e) => update({ from: e.target.value })} />
                <TextField label="Начало по" type="date" min={f.from || undefined} value={f.to} onChange={(e) => update({ to: e.target.value })} />
                <div className="flex items-end">
                    <Button variant="outline" onClick={() => setSp({}, { replace: true })} className="sm:w-auto">
                        Сбросить всё
                    </Button>
                </div>
            </div>

            <div className="mt-4">
                {list.isPending ? (
                    <div className="space-y-2" aria-hidden>
                        {Array.from({ length: 6 }, (_, i) => (
                            <Skeleton key={i} className="h-14 rounded-2xl" />
                        ))}
                    </div>
                ) : list.isError ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Не удалось загрузить брони</h2>
                        <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
                        <div className="mt-5">
                            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <p className="rounded-3xl border border-line bg-surface p-8 text-sm text-muted">По этим фильтрам броней нет.</p>
                ) : (
                    <>
                        <div className="overflow-x-auto rounded-3xl border border-line bg-surface">
                            <table className="w-full min-w-[56rem] text-left text-sm">
                                <thead className="border-b border-line text-xs text-muted">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Бронь</th>
                                    <th className="px-4 py-3 font-medium">Статус</th>
                                    <th className="px-4 py-3 font-medium">Арендатор</th>
                                    <th className="px-4 py-3 font-medium">Машина</th>
                                    <th className="px-4 py-3 font-medium">Партнёр</th>
                                    <th className="px-4 py-3 font-medium">Период</th>
                                    <th className="px-4 py-3 text-right font-medium">Сумма</th>
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-line">
                                {items.map((b) => (
                                    <tr key={b.id} className="transition-colors hover:bg-surface-2">
                                        <td className="px-4 py-3">
                                            <Link to={`/admin/bookings/${b.id}`} className="font-mono text-xs font-semibold text-fg hover:underline">
                                                {shortId(b.id)}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-3">
                        <span className="flex flex-wrap gap-1.5">
                          <Pill>{BOOKING_STATUS_LABEL[b.status]}</Pill>
                            {b.escalated && <Pill warn>В споре</Pill>}
                        </span>
                                        </td>
                                        <td className="px-4 py-3 text-muted">{b.renter.name ?? '—'}</td>
                                        <td className="px-4 py-3">
                                            <span className="block text-fg">{b.car.name ?? '—'}</span>
                                            <span className="block text-xs text-muted">{b.car.plateNumber}</span>
                                        </td>
                                        <td className="px-4 py-3 text-muted">{b.partner.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-xs text-muted">{formatPeriod(b.plannedStartAt, b.plannedEndAt)}</td>
                                        <td className="px-4 py-3 text-right font-medium text-fg">{b.finalPrice !== null ? formatMoney(b.finalPrice) : b.priceEstimate !== null ? `≈ ${formatMoney(b.priceEstimate)}` : '—'}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <Pager page={f.page} size={ADMIN_PAGE_SIZE} total={list.data?.total ?? 0} onPage={(p) => update({ page: p })} />
                    </>
                )}
            </div>
        </div>
    )
}