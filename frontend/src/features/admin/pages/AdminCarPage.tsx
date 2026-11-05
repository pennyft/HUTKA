import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ApiError, errorMessage } from '@/api/errors'
import { PhotoGrid } from '@/features/bookings/components/PhotoGrid'
import { BOOKING_MODE_LABEL, FUEL_LABEL, TRANSMISSION_LABEL } from '@/features/partner/labels'
import { formatDateTime, formatMoney } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { Pill } from '../components/Pills'
import { ReasonForm } from '../components/ReasonForm'
import { adminCarBadges, carActions, hasDoubleHiding, inspectionState } from '../cars/logic'
import { useAdminCar, useCarModeration } from '../cars/hooks'
import { formatDay } from '../logic'

function Row({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className="flex justify-between gap-4 py-1.5 text-sm">
            <dt className="shrink-0 text-muted">{label}</dt>
            <dd className="min-w-0 break-words text-right font-medium text-fg">{value}</dd>
        </div>
    )
}

const todayLocal = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * AD7. Карточка машины для модерации: фото, данные, документы (техпаспорт, полис, техосмотр), партнёр, число страйков. Действия:
 * одобрить (первая одобренная машина делает пользователя партнёром), отклонить с причиной, скрыть с причиной и снять скрытие, вернуть
 * в каталог машину, скрытую по неявкам (страйки сбрасываются), удалить (только без завершённых поездок и активных броней).
 * GET /admin/cars/{id} нужно добавить на бэке (в исходном бэке есть только список и действия).
 */
export default function AdminCarPage() {
    const { carId = '' } = useParams()
    const navigate = useNavigate()
    const { data: c, isPending, isError, error, refetch } = useAdminCar(carId)
    const m = useCarModeration()
    const [mode, setMode] = useState<'reject' | 'hide' | 'delete' | null>(null)

    if (isPending) return <div className="mx-auto max-w-4xl space-y-3 px-4 pt-6"><Skeleton className="h-10 w-1/2" aria-hidden /><Skeleton className="h-80 rounded-3xl" aria-hidden /></div>
    if (isError) {
        const notFound = error instanceof ApiError && (error.status === 404 || error.status === 405)
        return (
            <div className="mx-auto max-w-4xl px-4 pb-10 pt-6">
                <div className="rounded-3xl border border-line bg-surface p-8">
                    <h1 className="text-lg font-bold text-fg">{notFound ? 'Машина не найдена' : 'Не удалось загрузить машину'}</h1>
                    <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                    {notFound && <p className="mt-2 text-xs text-muted">Если машина точно есть, проверьте, что на бэке добавлен GET /admin/cars/{'{id}'} (см. инструкцию к модулю).</p>}
                    <div className="mt-5 flex gap-3">
                        {!notFound && (
                            <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                                Повторить
                            </Button>
                        )}
                        <Link to="/admin/cars" className="inline-block rounded-xl border border-line bg-surface px-4 py-3.5 text-sm font-semibold text-fg hover:bg-surface-2">
                            Все машины
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    const act = carActions(c)
    const insp = inspectionState(c.inspectionExpiryDate, todayLocal())
    const busy = Object.values(m).some((x) => x.isPending)

    return (
        <div className="mx-auto max-w-4xl space-y-5 px-4 pb-10 pt-6">
            <div>
                <Link to="/admin/cars" className="text-sm text-muted underline hover:opacity-80">
                    Все машины
                </Link>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">
                    {c.make} {c.model}, {c.year}
                </h1>
                <p className="mt-2 flex flex-wrap gap-2">
                    {adminCarBadges(c).map((b) => (
                        <Pill key={b.label} warn={b.warn}>
                            {b.label}
                        </Pill>
                    ))}
                </p>
            </div>

            {c.photos.length > 0 ? (
                <section className="rounded-3xl border border-line bg-surface p-5">
                    <PhotoGrid title={`Фотографии (${c.photos.length})`} urls={c.photos} />
                </section>
            ) : (
                <p className="rounded-3xl border border-danger/40 bg-surface p-5 text-sm text-danger">У машины нет фотографий.</p>
            )}

            <div className="grid gap-5 md:grid-cols-2">
                <section className="rounded-3xl border border-line bg-surface p-5">
                    <h2 className="mb-1 font-bold text-fg">Машина</h2>
                    <dl className="divide-y divide-line">
                        <Row label="Госномер" value={c.plateNumber} />
                        <Row label="Пробег" value={`${c.mileageKm.toLocaleString('ru-RU')} км`} />
                        <Row label="Топливо" value={FUEL_LABEL[c.fuelType] ?? c.fuelType} />
                        <Row label="Коробка" value={TRANSMISSION_LABEL[c.transmission] ?? c.transmission} />
                        <Row label="Мест" value={c.seats} />
                        <Row label="Кузов" value={c.bodyType} />
                        <Row label="Адрес" value={c.address} />
                        <Row label="Цена за час" value={formatMoney(c.pricePerHour)} />
                        <Row label="Бронирование" value={BOOKING_MODE_LABEL[c.bookingMode]?.title ?? c.bookingMode} />
                        <Row label="Заявка подана" value={formatDateTime(c.createdAt)} />
                    </dl>
                    {c.description && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted">{c.description}</p>}
                </section>

                <div className="space-y-5">
                    <section className="rounded-3xl border border-line bg-surface p-5">
                        <h2 className="mb-1 font-bold text-fg">Документы</h2>
                        <dl className="divide-y divide-line">
                            <Row label="Техпаспорт" value={c.techPassportNumber} />
                            <Row label="Страховой полис" value={c.insurancePolicyNumber} />
                            <Row label="Техосмотр до" value={formatDay(c.inspectionExpiryDate)} />
                        </dl>
                        {insp.kind === 'expired' && <p className="mt-2 text-sm font-semibold text-danger">Техосмотр просрочен на {insp.days} дн.</p>}
                        {insp.kind === 'soon' && <p className="mt-2 text-sm font-semibold text-danger">Техосмотр истекает через {insp.days} дн.</p>}
                        <p className="mt-2 text-xs text-muted">Сверьте данные с фотографиями и документами партнёра: автоматической проверки достоверности нет.</p>
                    </section>

                    <section className="rounded-3xl border border-line bg-surface p-5">
                        <h2 className="mb-1 font-bold text-fg">Партнёр</h2>
                        <dl className="divide-y divide-line">
                            <Row label="Имя" value={<Link to={`/admin/users/${c.partnerId}`} className="underline hover:opacity-80">{c.partnerName ?? 'профиль'}</Link>} />
                            <Row label="Email" value={c.partnerEmail ?? '—'} />
                            <Row label="Страйков неявки" value={c.noShowStrikes} />
                        </dl>
                        <Link to={`/admin/bookings?carId=${c.id}`} className="mt-3 inline-block text-sm font-semibold text-fg underline hover:opacity-80">
                            История поездок машины
                        </Link>
                    </section>
                </div>
            </div>

            {(c.rejectionReason || c.hiddenByAdminReason) && (
                <section className="rounded-3xl border border-line bg-surface p-5 text-sm">
                    {c.rejectionReason && <p><span className="text-muted">Причина отказа: </span><span className="font-medium text-fg">{c.rejectionReason}</span></p>}
                    {c.hiddenByAdminReason && <p><span className="text-muted">Причина скрытия: </span><span className="font-medium text-fg">{c.hiddenByAdminReason}</span></p>}
                </section>
            )}

            <section className="rounded-3xl border border-line bg-surface p-5">
                <h2 className="mb-3 font-bold text-fg">Действия</h2>
                {hasDoubleHiding(c) && <p className="mb-3 text-sm text-muted">Машина скрыта и администратором, и по неявкам: чтобы она вернулась в каталог, снимите оба скрытия.</p>}

                {mode === 'reject' ? (
                    <ReasonForm label="Причина отказа (её увидит партнёр)" submitLabel="Отклонить заявку" loading={m.reject.isPending} onCancel={() => setMode(null)} onSubmit={(reason) => m.reject.mutate({ id: c.id, reason }, { onSuccess: () => setMode(null) })} />
                ) : mode === 'hide' ? (
                    <ReasonForm label="Причина скрытия" submitLabel="Скрыть из каталога" loading={m.hide.isPending} onCancel={() => setMode(null)} onSubmit={(reason) => m.hide.mutate({ id: c.id, reason }, { onSuccess: () => setMode(null) })} />
                ) : mode === 'delete' ? (
                    <div className="rounded-2xl border border-line bg-surface-2 p-3">
                        <p className="text-sm text-fg">Удалить машину безвозвратно? Это возможно только если у неё нет завершённых поездок и активных броней.</p>
                        <div className="mt-2 grid grid-cols-2 gap-3">
                            <Button variant="dark" loading={m.remove.isPending} onClick={() => m.remove.mutate(c.id, { onSuccess: () => navigate('/admin/cars', { replace: true }) })}>
                                Удалить
                            </Button>
                            <Button variant="outline" disabled={m.remove.isPending} onClick={() => setMode(null)}>
                                Отмена
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {act.moderate && (
                            <>
                                <Button variant="dark" loading={m.approve.isPending} disabled={busy && !m.approve.isPending} onClick={() => m.approve.mutate(c.id)} className="sm:w-auto">
                                    Одобрить
                                </Button>
                                <Button variant="outline" disabled={busy} onClick={() => setMode('reject')} className="sm:w-auto">
                                    Отклонить
                                </Button>
                            </>
                        )}
                        {act.hide && (
                            <Button variant="outline" disabled={busy} onClick={() => setMode('hide')} className="sm:w-auto">
                                Скрыть
                            </Button>
                        )}
                        {act.unhide && (
                            <Button variant="outline" loading={m.unhide.isPending} disabled={busy && !m.unhide.isPending} onClick={() => m.unhide.mutate(c.id)} className="sm:w-auto">
                                Снять скрытие админа
                            </Button>
                        )}
                        {act.returnToCatalog && (
                            <Button variant="outline" loading={m.returnToCatalog.isPending} disabled={busy && !m.returnToCatalog.isPending} onClick={() => m.returnToCatalog.mutate(c.id)} className="sm:w-auto">
                                Вернуть из неявок
                            </Button>
                        )}
                        {act.remove && (
                            <Button variant="outline" disabled={busy} onClick={() => setMode('delete')} className="sm:w-auto">
                                Удалить
                            </Button>
                        )}
                    </div>
                )}
            </section>
        </div>
    )
}