import { useMemo } from 'react'
import { Star } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { usePartnerReviews } from '../hooks'

/** P8. Отзывы арендаторов: GET /partner/reviews (по 20). У оценки машины указана машина, оценка без машины относится к вам как к партнёру. */
export default function PartnerReviewsPage() {
    const list = usePartnerReviews()
    const items = useMemo(() => list.data?.pages.flatMap((p) => p.items) ?? [], [list.data])
    const total = list.data?.pages[0]?.total ?? 0

    return (
        <div className="mx-auto max-w-2xl px-4 pb-10 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Отзывы</h1>
            {!list.isPending && !list.isError && <p className="mt-1 text-sm text-muted">Всего: {total}</p>}

            <div className="mt-4">
                {list.isPending ? (
                    <div className="space-y-3" aria-hidden>
                        {Array.from({ length: 3 }, (_, i) => (
                            <Skeleton key={i} className="h-24 rounded-3xl" />
                        ))}
                    </div>
                ) : list.isError ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Не удалось загрузить отзывы</h2>
                        <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
                        <div className="mt-5">
                            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        </div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="rounded-3xl border border-line bg-surface p-8">
                        <h2 className="text-lg font-bold text-fg">Отзывов пока нет</h2>
                        <p className="mt-1 text-sm text-muted">Они появятся после завершённых поездок.</p>
                    </div>
                ) : (
                    <>
                        <ul className="space-y-3">
                            {items.map((r) => (
                                <li key={r.id} className="rounded-3xl border border-line bg-surface p-4">
                                    <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1 font-semibold text-fg" aria-label={`Оценка ${r.score} из 5`}>
                      <Star className="size-4" aria-hidden />
                        {r.score}
                    </span>
                                        <span className="text-xs text-muted">{formatDateTime(r.createdAt)}</span>
                                    </div>
                                    <p className="mt-1 text-xs text-muted">
                                        {r.car ? r.car : 'О вас как о партнёре'}
                                        {r.authorFirstName && <> · {r.authorFirstName}</>}
                                    </p>
                                    {r.comment && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-fg">{r.comment}</p>}
                                </li>
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
        </div>
    )
}