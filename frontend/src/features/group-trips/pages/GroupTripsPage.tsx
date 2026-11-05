import { Link, useSearchParams } from 'react-router'
import { Users } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { TripCard } from '../components/TripCard'
import { useTripList } from '../hooks'
import type { TripStatus } from '../types'

type Tab = 'open' | 'closed' | 'mine'

const TABS: { id: Tab; label: string }[] = [
    { id: 'open', label: 'Открытые' },
    { id: 'closed', label: 'Набор закрыт' },
    { id: 'mine', label: 'Мои' },
]

const EMPTY: Record<Tab, string> = {
    open: 'Сейчас нет открытых поездок. Создайте свою, и другие смогут присоединиться.',
    closed: 'Нет поездок с закрытым набором.',
    mine: 'Вы пока не участвуете ни в одной поездке.',
}

const isTab = (v: string | null): v is Tab => v === 'open' || v === 'closed' || v === 'mine'

/**
 * B16. Групповые поездки: GET /group-trips. Вкладки «Открытые» и «Набор закрыт» (в общем списке бэк допускает только
 * эти два статуса) и «Мои» (mine=true, любые статусы). Вкладка хранится в адресе (?tab=).
 * Нужен подтверждённый ВУ (иначе 403): маршрут закрыт гейтом RequireVerified.
 */
export default function GroupTripsPage() {
    const [sp, setSp] = useSearchParams()
    const requested = sp.get('tab')
    const tab: Tab = isTab(requested) ? requested : 'open'
    const status: TripStatus | undefined = tab === 'open' ? 'open' : tab === 'closed' ? 'closed' : undefined
    const list = useTripList({ mine: tab === 'mine', status })
    const trips = list.data?.pages.flatMap((p) => p.items) ?? []
    const total = list.data?.pages[0]?.total ?? 0

    return (
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-fg">Групповые поездки</h1>
                <Link to="/app/group-trips/new" className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover">
                    Создать поездку
                </Link>
            </div>

            <div role="tablist" aria-label="Список поездок" className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 py-1 [scrollbar-width:none]">
                {TABS.map((t) => {
                    const selected = t.id === tab
                    return (
                        <button
                            key={t.id}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            aria-controls="trips-panel"
                            onClick={() => setSp({ tab: t.id }, { replace: true })}
                            className={`h-9 shrink-0 rounded-full border px-3.5 text-sm transition-colors ${selected ? 'border-primary bg-accent font-medium text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
                        >
                            {t.label}
                        </button>
                    )
                })}
            </div>

            <div id="trips-panel" role="tabpanel" className="mt-4 space-y-3">
                {list.isPending ? (
                    Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32 w-full rounded-3xl" />)
                ) : list.isError ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Не удалось загрузить поездки</h2>
                        <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
                        <div className="mt-5">
                            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        </div>
                    </div>
                ) : trips.length === 0 ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <Users className="mb-3 size-6 text-muted" aria-hidden />
                        <p className="text-sm text-muted">{EMPTY[tab]}</p>
                    </div>
                ) : (
                    <>
                        {trips.map((t) => (
                            <TripCard key={t.id} trip={t} />
                        ))}
                        {list.hasNextPage && (
                            <div className="flex flex-col items-center gap-2 pt-2">
                                <p className="text-xs text-muted">
                                    Показано {trips.length} из {total}
                                </p>
                                <Button variant="outline" loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()} className="sm:w-auto sm:px-8">
                                    Показать ещё
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}