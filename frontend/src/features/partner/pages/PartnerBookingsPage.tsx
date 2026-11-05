import { useMemo, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { useNow } from '@/features/bookings/useNow'
import type { BookingStatus } from '@/features/bookings/types'
import { SelectField } from '@/features/support/components/FormFields'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'
import { Skeleton } from '@/shared/ui/Skeleton'
import { BookingRow } from '../components/BookingRow'
import { filtersToQuery, sortPartnerBookings, type BookingFilters } from '../bookingsLogic'
import { usePartnerBookings, usePartnerCars } from '../hooks'

const STATUSES: { value: '' | BookingStatus; label: string }[] = [
    { value: '', label: 'Все статусы' },
    { value: 'pending', label: 'Ожидают' },
    { value: 'active', label: 'Активные' },
    { value: 'finished', label: 'Завершённые' },
    { value: 'cancelled', label: 'Отменённые' },
]

/**
 * P5. Брони партнёра: GET /partner/bookings (все машины в одном списке) с фильтрами по статусу, машине и датам. Заявки, на которые
 * нужно ответить, сверху. Одобрить или отклонить заявку (с причиной) можно прямо в списке. Названия машин берутся из GET /partner/cars.
 */
export default function PartnerBookingsPage() {
    const [filters, setFilters] = useState<BookingFilters>({ status: '', carId: '', from: '', to: '' })
    const now = useNow(30_000)
    const cars = usePartnerCars()
    const list = usePartnerBookings(filtersToQuery(filters))
    const names = useMemo(() => Object.fromEntries((cars.data ?? []).map((c) => [c.id, `${c.make} ${c.model}`])), [cars.data])
    const items = useMemo(() => sortPartnerBookings(list.data ?? []), [list.data])
    const set = <K extends keyof BookingFilters>(k: K, v: BookingFilters[K]) => setFilters((f) => ({ ...f, [k]: v }))
    const dirty = filters.status !== '' || filters.carId !== '' || filters.from !== '' || filters.to !== ''

    return (
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Брони</h1>
            <p className="mt-1 text-sm text-muted">Все брони по всем вашим машинам.</p>

            <div className="mt-4 grid gap-3 rounded-3xl border border-line bg-surface p-4 sm:grid-cols-2">
                <SelectField label="Статус" value={filters.status} onChange={(e) => set('status', e.target.value as BookingFilters['status'])}>
                    {STATUSES.map((s) => (
                        <option key={s.value} value={s.value}>
                            {s.label}
                        </option>
                    ))}
                </SelectField>
                <SelectField label="Машина" value={filters.carId} onChange={(e) => set('carId', e.target.value)}>
                    <option value="">Все машины</option>
                    {(cars.data ?? []).map((c) => (
                        <option key={c.id} value={c.id}>
                            {c.make} {c.model}
                        </option>
                    ))}
                </SelectField>
                <TextField label="С даты" type="date" value={filters.from} onChange={(e) => set('from', e.target.value)} />
                <TextField label="По дату" type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set('to', e.target.value)} />
                {dirty && (
                    <div className="sm:col-span-2">
                        <Button variant="outline" onClick={() => setFilters({ status: '', carId: '', from: '', to: '' })} className="sm:w-auto">
                            Сбросить фильтры
                        </Button>
                    </div>
                )}
            </div>

            <div className="mt-4">
                {list.isPending ? (
                    <div className="space-y-3" aria-hidden>
                        {Array.from({ length: 3 }, (_, i) => (
                            <Skeleton key={i} className="h-28 rounded-3xl" />
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
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <CalendarClock className="mb-3 size-6 text-muted" aria-hidden />
                        <h2 className="text-lg font-bold text-fg">{dirty ? 'По этим фильтрам броней нет' : 'Броней пока нет'}</h2>
                    </div>
                ) : (
                    <ul className="space-y-3">
                        {items.map((b) => (
                            <BookingRow key={b.id} booking={b} carName={names[b.carId] ?? 'Автомобиль'} now={now} />
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}