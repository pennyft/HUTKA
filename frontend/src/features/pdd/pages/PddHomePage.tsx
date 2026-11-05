import { ClipboardCheck } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { AttemptHistory } from '../components/AttemptHistory'
import { DiscountCard } from '../components/DiscountCard'
import { usePddHistory, useStartPdd } from '../hooks'
import { homeState } from '../logic'
import { PDD_RULES } from '../rules'

/**
 * B14. Тест ПДД: GET /pddtest/attempts (цикл, скидка, история). Кнопка «Начать» запускает GET /pddtest/questions,
 * который создаёт попытку, поэтому запрос идёт только по нажатию. Идущая попытка показывается как «Продолжить».
 * Доступ только после подтверждения ВУ (RequireVerified уводит на /app/license).
 */
export default function PddHomePage() {
    const { data, isPending, isError, error, refetch } = usePddHistory()
    const start = useStartPdd()

    return (
        <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Тест ПДД</h1>
            <p className="mt-1 text-sm text-muted">
                Сдайте тест и получите скидку {PDD_RULES.discountPercent}% на аренду на {PDD_RULES.discountDays} дня.
            </p>

            {isPending ? (
                <div className="mt-5 space-y-3" aria-hidden>
                    <Skeleton className="h-40 w-full rounded-3xl" />
                    <Skeleton className="h-24 w-full rounded-3xl" />
                </div>
            ) : isError ? (
                <div className="mt-5 rounded-3xl border border-line bg-surface p-8">
                    <h2 className="text-lg font-bold text-fg">Не удалось загрузить тест</h2>
                    <p className="mt-1 text-sm text-muted">{errorMessage(error)}</p>
                    <div className="mt-5">
                        <Button variant="dark" onClick={() => refetch()} className="sm:w-auto">
                            Повторить
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="mt-5 space-y-5">
                    {data.activeDiscount && <DiscountCard discount={data.activeDiscount} />}

                    <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
                        <div className="flex items-start gap-3">
                            <ClipboardCheck className="mt-0.5 size-6 shrink-0 text-muted" aria-hidden />
                            <div className="min-w-0 flex-1">
                                <CycleBlock state={homeState(data)} start={start} />
                            </div>
                        </div>
                        <ul className="mt-5 space-y-1 border-t border-line pt-4 text-sm text-muted">
                            <li>{PDD_RULES.questions} случайных вопросов</li>
                            <li>{PDD_RULES.timeLimitMinutes} минут на всё</li>
                            <li>Проходной результат: не больше {PDD_RULES.maxErrors} ошибки</li>
                            <li>{PDD_RULES.attemptsPerCycle} попытки в цикле, цикл длится месяц</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-3 text-lg font-bold text-fg">История попыток</h2>
                        <AttemptHistory attempts={data.attempts} />
                    </section>
                </div>
            )}
        </div>
    )
}

function CycleBlock({ state, start }: { state: ReturnType<typeof homeState>; start: ReturnType<typeof useStartPdd> }) {
    const run = () => start.mutate()
    switch (state.kind) {
        case 'resume':
            return (
                <>
                    <h2 className="font-bold text-fg">Тест не завершён</h2>
                    <p className="mt-1 text-sm text-muted">Попытка идёт, время ограничено. Продолжите с того места, где остановились.</p>
                    <div className="mt-4">
                        <Button variant="dark" loading={start.isPending} onClick={run} className="sm:w-auto">
                            Продолжить тест
                        </Button>
                    </div>
                </>
            )
        case 'open':
            return (
                <>
                    <h2 className="font-bold text-fg">
                        Осталось попыток: {state.attemptsLeft} из {state.maxAttempts}
                    </h2>
                    <p className="mt-1 text-sm text-muted">Таймер запускается сразу после нажатия на кнопку.</p>
                    <div className="mt-4">
                        <Button variant="dark" loading={start.isPending} onClick={run} className="sm:w-auto">
                            Начать тест
                        </Button>
                    </div>
                </>
            )
        case 'passed':
            return (
                <>
                    <h2 className="font-bold text-fg">Тест сдан</h2>
                    <p className="mt-1 text-sm text-muted">
                        {state.nextCycleAt ? `Новая попытка откроется ${formatDateTime(state.nextCycleAt)}.` : 'Новая попытка откроется в следующем цикле.'}
                    </p>
                </>
            )
        case 'exhausted':
            return (
                <>
                    <h2 className="font-bold text-fg">Попытки в этом цикле закончились</h2>
                    <p className="mt-1 text-sm text-muted">
                        {state.nextCycleAt ? `Новый цикл откроется ${formatDateTime(state.nextCycleAt)}.` : 'Новый цикл откроется позже.'}
                    </p>
                </>
            )
    }
}