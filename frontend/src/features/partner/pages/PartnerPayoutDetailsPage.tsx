import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'
import { Skeleton } from '@/shared/ui/Skeleton'
import { useBankDetails, useSaveBankDetails } from '../hooks'
import { cardProblem, formatCardInput, holderProblem } from '../payoutsLogic'

/**
 * P11. Банковские реквизиты: GET и PUT /partner/payout-details. Наружу сервер отдаёт только маску номера и имя держателя, поэтому
 * для смены нужно ввести номер заново. Номер 16–19 цифр (пробелы и дефисы допустимы), имя 2–100 символов: буквы, пробел, точка, апостроф, дефис.
 */
export default function PartnerPayoutDetailsPage() {
    const { data, isPending, isError, error, refetch } = useBankDetails()
    const save = useSaveBankDetails()
    const [editing, setEditing] = useState(false)
    const [card, setCard] = useState('')
    const [holder, setHolder] = useState('')
    const [errors, setErrors] = useState<{ card?: string; holder?: string }>({})

    function submit(e: FormEvent) {
        e.preventDefault()
        const next = { card: cardProblem(card) ?? undefined, holder: holderProblem(holder) ?? undefined }
        setErrors(next)
        if (next.card || next.holder) return
        save.mutate({ cardNumber: card, holderName: holder.trim() }, { onSuccess: () => { setEditing(false); setCard('') } })
    }

    if (isPending) return <div className="mx-auto max-w-xl px-4 pt-6"><Skeleton className="h-48 rounded-3xl" aria-hidden /></div>
    if (isError) {
        return (
            <div className="mx-auto max-w-xl px-4 pb-10 pt-6">
                <div className="rounded-3xl border border-line bg-surface p-8">
                    <h1 className="text-lg font-bold text-fg">Не удалось загрузить реквизиты</h1>
                    <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                    <div className="mt-5">
                        <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                            Повторить
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const showForm = editing || !data.present
    return (
        <div className="mx-auto max-w-xl space-y-5 px-4 pb-10 pt-6">
            <div>
                <Link to="/partner/payouts" className="text-sm text-muted underline hover:opacity-80">
                    Выплаты
                </Link>
                <h1 className="mt-2 text-2xl font-bold tracking-tight text-fg">Реквизиты для выплат</h1>
                <p className="mt-1 text-sm text-muted">Выплаты перечисляются на эту карту раз в неделю.</p>
            </div>

            {data.present && (
                <section className="rounded-3xl border border-line bg-surface p-5">
                    <p className="text-xs text-muted">Карта</p>
                    <p className="mt-1 text-lg font-bold tracking-wide text-fg">{data.cardMasked}</p>
                    <p className="mt-2 text-xs text-muted">Держатель</p>
                    <p className="mt-0.5 font-medium text-fg">{data.holderName}</p>
                    {!editing && (
                        <div className="mt-4">
                            <Button variant="outline" onClick={() => setEditing(true)} className="sm:w-auto">
                                Изменить
                            </Button>
                        </div>
                    )}
                </section>
            )}

            {showForm && (
                <form onSubmit={submit} noValidate className="space-y-4 rounded-3xl border border-line bg-surface p-5">
                    <h2 className="font-bold text-fg">{data.present ? 'Новые реквизиты' : 'Добавьте карту'}</h2>
                    <TextField label="Номер карты" inputMode="numeric" autoComplete="cc-number" value={card} onChange={(e) => setCard(formatCardInput(e.target.value))} error={errors.card} hint="От 16 до 19 цифр" />
                    <TextField label="Имя держателя" autoComplete="cc-name" maxLength={100} value={holder} onChange={(e) => setHolder(e.target.value)} error={errors.holder} hint="Как на карте, буквами" />
                    {save.isError && (
                        <p role="alert" className="rounded-xl border border-danger/40 bg-surface-2 p-3 text-sm text-fg">
                            {errorMessage(save.error)}
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <Button type="submit" variant="dark" loading={save.isPending}>
                            Сохранить
                        </Button>
                        {data.present && (
                            <Button type="button" variant="outline" disabled={save.isPending} onClick={() => { setEditing(false); setErrors({}) }}>
                                Отмена
                            </Button>
                        )}
                    </div>
                    <p className="text-xs text-muted">После сохранения полный номер не показывается, только маска.</p>
                </form>
            )}
        </div>
    )
}