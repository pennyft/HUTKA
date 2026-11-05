import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { BellOff } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { useNow } from '@/features/bookings/useNow'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { NotificationItem } from '../components/NotificationItem'
import { useMarkRead, useNotifications } from '../hooks'
import type { Cabinet } from '../types'

/**
 * B23. Уведомления: GET /notifications (по 20), PATCH /notifications/{id}/read. Новые приходят по WebSocket
 * (SocketBridge перечитывает ленту). Страница общая для кабинета арендатора и партнёра: часть уведомлений
 * (статус брони, спор, поддержка) ведёт в тот кабинет, где открыт список.
 */
export default function NotificationsPage() {
    const cabinet: Cabinet = useLocation().pathname.startsWith('/partner') ? 'partner' : 'renter'
    const [unreadOnly, setUnreadOnly] = useState(false)
    const now = useNow(60_000)
    const list = useNotifications(unreadOnly)
    const markRead = useMarkRead()

    const items = useMemo(() => list.data?.pages.flatMap((p) => p.notifications) ?? [], [list.data])
    const unreadCount = list.data?.pages[0]?.unreadCount ?? 0
    const unreadLoaded = items.filter((n) => !n.read).map((n) => n.id)

    return (
        <div className="mx-auto max-w-2xl px-4 pb-10 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-fg">Уведомления</h1>
                    {!list.isPending && <p className="mt-1 text-sm text-muted">{unreadCount > 0 ? `Непрочитанных: ${unreadCount}` : 'Всё прочитано'}</p>}
                </div>
                {unreadLoaded.length > 0 && (
                    <Button variant="outline" loading={markRead.isPending} onClick={() => markRead.mutate(unreadLoaded)} className="sm:w-auto">
                        Отметить прочитанными
                    </Button>
                )}
            </div>

            <div role="group" aria-label="Фильтр уведомлений" className="mt-4 flex gap-2">
                {[
                    { value: false, label: 'Все' },
                    { value: true, label: 'Непрочитанные' },
                ].map((f) => (
                    <button
                        key={f.label}
                        type="button"
                        aria-pressed={unreadOnly === f.value}
                        onClick={() => setUnreadOnly(f.value)}
                        className={`h-9 rounded-full border px-3.5 text-sm transition-colors ${unreadOnly === f.value ? 'border-primary bg-accent font-medium text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="mt-4">
                {list.isPending ? (
                    <div className="space-y-3" aria-hidden>
                        {Array.from({ length: 4 }, (_, i) => (
                            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
                        ))}
                    </div>
                ) : list.isError ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Не удалось загрузить уведомления</h2>
                        <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
                        <div className="mt-5">
                            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <BellOff className="mb-3 size-6 text-muted" aria-hidden />
                        <p className="text-sm text-muted">{unreadOnly ? 'Непрочитанных уведомлений нет.' : 'Уведомлений пока нет.'}</p>
                        {unreadOnly && (
                            <button type="button" onClick={() => setUnreadOnly(false)} className="mt-3 text-sm font-medium text-fg underline hover:opacity-80">
                                Показать все
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
                            {items.map((n) => (
                                <NotificationItem key={n.id} notification={n} cabinet={cabinet} now={now} onRead={(id) => markRead.mutate([id])} />
                            ))}
                        </ul>
                        {list.hasNextPage && (
                            <div className="mt-5 flex justify-center">
                                <Button variant="outline" loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()} className="sm:w-auto sm:px-8">
                                    Показать ещё
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>

            <p className="mt-6 text-center text-xs text-muted">
                Нужна помощь?{' '}
                <Link to={cabinet === 'partner' ? '/partner/support' : '/app/support'} className="underline hover:text-fg">
                    Написать в поддержку
                </Link>
            </p>
        </div>
    )
}