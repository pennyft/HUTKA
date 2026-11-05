import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { CalendarX } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { BookingListCard } from '../components/BookingListCard'
import { useCarsById, useMyBookings } from '../hooks'
import { TAB_LABEL, TAB_ORDER, countByTab, defaultTab, sortForTab, type BookingTab } from '../status'

const isTab = (v: string | null): v is BookingTab => !!v && (TAB_ORDER as string[]).includes(v)

const EMPTY: Record<BookingTab, string> = {
    pending: 'Нет бронирований в ожидании. Выберите машину в каталоге.',
    active: 'Сейчас нет активных поездок.',
    finished: 'Завершённых поездок пока нет.',
    cancelled: 'Отменённых бронирований нет.',
}

/**
 * B8. Мои поездки: GET /bookings (все брони одним запросом), вкладки по статусам со счётчиками.
 * Название и фото машины подгружаются отдельно (в брони есть только carId). Вкладка хранится в адресе (?tab=).
 * Если вкладка не указана, открывается первая непустая: активные, затем ожидающие.
 */
export default function MyBookingsPage() {
    const [sp, setSp] = useSearchParams()
    const { data, isPending, isError, error, refetch } = useMyBookings()
    const bookings = useMemo(() => data ?? [], [data])
    const counts = useMemo(() => countByTab(bookings), [bookings])
    const requested = sp.get('tab')
    const tab: BookingTab = isTab(requested) ? requested : defaultTab(counts)
    const visible = useMemo(() => sortForTab(tab, bookings.filter((b) => b.status === tab)), [tab, bookings])
    const cars = useCarsById(visible.map((b) => b.carId))

    return (
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Мои поездки</h1>

            <div role="tablist" aria-label="Статус поездок" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
                {TAB_ORDER.map((t) => {
                    const selected = t === tab
                    return (
                        <button
                            key={t}
                            type="button"
                            role="tab"
                            id={`tab-${t}`}
                            aria-selected={selected}
                            aria-controls="bookings-panel"
                            onClick={() => setSp({ tab: t }, { replace: true })}
                            className={`h-9 shrink-0 rounded-full border px-3.5 text-sm transition-colors ${selected ? 'border-primary bg-accent font-medium text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
                        >
                            {TAB_LABEL[t]}
                            {!isPending && <span className={`ml-1.5 text-xs ${selected ? '' : 'text-muted'}`}>{counts[t]}</span>}
                        </button>
                    )
                })}
            </div>

            <div id="bookings-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="mt-4 space-y-3">
                {isPending ? (
                    Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)
                ) : isError ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Не удалось загрузить поездки</h2>
                        <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                        <div className="mt-5">
                            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        </div>
                    </div>
                ) : visible.length === 0 ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <CalendarX className="mb-3 size-6 text-muted" aria-hidden />
                        <p className="text-sm text-muted">{EMPTY[tab]}</p>
                        {(tab === 'pending' || tab === 'active') && (
                            <Link to="/cars" className="mt-5 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover">
                                В каталог
                            </Link>
                        )}
                    </div>
                ) : (
                    visible.map((b) => <BookingListCard key={b.id} booking={b} lookup={cars[b.carId]} />)
                )}
            </div>
        </div>
    )
}