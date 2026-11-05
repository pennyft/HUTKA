import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router'
import { ApiError, errorMessage } from '@/api/errors'
import { useNow } from '@/features/bookings/useNow'
import { Button } from '@/shared/ui/Button'
import { toast } from '@/shared/ui/toast'
import { QuestionCard } from '../components/QuestionCard'
import { TestResult } from '../components/TestResult'
import { useSubmitPdd } from '../hooks'
import { buildAnswers, formatTimer, remainingMs, unansweredCount } from '../logic'
import { clearAnswers, loadAnswers, saveAnswers, usePddSessionStore } from '../session'
import type { PddResult, PddSession } from '../types'

/**
 * B15. Прохождение теста. Сам запрос GET /pddtest/questions здесь не делается (он создаёт попытку): сессию кладёт кнопка
 * на главной (B14). Без сессии, например после обновления страницы, возвращаем на главную: там будет «Продолжить».
 * Таймер считается от expiresAt с сервера. Когда время вышло, ответы отправляются автоматически: бэк принимает их
 * ещё 15 секунд после срока. Неотвеченные вопросы считаются ошибками.
 */
export default function PddTestPage() {
    const session = usePddSessionStore((s) => s.session)
    if (!session) return <Navigate to="/app/pdd" replace />
    return <TestRunner key={session.attemptId} session={session} />
}

function TestRunner({ session }: { session: PddSession }) {
    const { attemptId, attemptNumber, maxAttempts, expiresAt, questions } = session
    const [answers, setAnswers] = useState(() => loadAnswers(attemptId, questions))
    const [index, setIndex] = useState(0)
    const [confirm, setConfirm] = useState(false)
    const [result, setResult] = useState<PddResult | null>(null)
    /** Текст 409 от бэка: время вышло или ответы уже приняты. */
    const [closed, setClosed] = useState<string | null>(null)
    const submit = useSubmitPdd()
    const now = useNow(1000)
    const remaining = remainingMs(expiresAt, now)
    const expired = remaining <= 0
    const finished = result !== null || closed !== null
    const unanswered = unansweredCount(questions, answers)

    function send() {
        submit.mutate(
            { attemptId, answers: buildAnswers(questions, answers) },
            {
                onSuccess: (r) => {
                    clearAnswers(attemptId)
                    setResult(r)
                },
                onError: (e) => {
                    if (e instanceof ApiError && e.status === 409) {
                        clearAnswers(attemptId)
                        setClosed(e.message)
                    } else {
                        toast.error(errorMessage(e))
                    }
                },
            },
        )
    }

    const sendRef = useRef(send)
    sendRef.current = send
    const autoSent = useRef(false)
    const finishedRef = useRef(false)
    finishedRef.current = finished

    // время вышло: один раз отправляем то, что успели ответить (при сбое сети остаётся ручная кнопка)
    useEffect(() => {
        if (expired && !finished && !autoSent.current) {
            autoSent.current = true
            sendRef.current()
        }
    }, [expired, finished])

    // пока идёт тест, браузер переспросит перед закрытием вкладки
    useEffect(() => {
        if (finished) return
        const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault()
        window.addEventListener('beforeunload', onBeforeUnload)
        return () => window.removeEventListener('beforeunload', onBeforeUnload)
    }, [finished])

    // ушли с экрана после итога: сессия больше не нужна (иначе «назад» показал бы старый тест)
    useEffect(
        () => () => {
            if (finishedRef.current) usePddSessionStore.getState().clear()
        },
        [],
    )

    if (result) {
        return (
            <div className="mx-auto max-w-xl px-4 pb-10 pt-6">
                <TestResult result={result} />
            </div>
        )
    }

    if (closed) {
        return (
            <div className="mx-auto max-w-xl px-4 pb-10 pt-6">
                <div className="rounded-3xl border border-line bg-surface p-8">
                    <h1 className="text-xl font-bold text-fg">Ответы не приняты</h1>
                    <p className="mt-2 text-sm text-muted">{closed}</p>
                    <Link to="/app/pdd" className="mt-6 inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover">
                        К результатам
                    </Link>
                </div>
            </div>
        )
    }

    const question = questions[index]
    const locked = expired || submit.isPending
    const warn = remaining <= 60_000 ? 'Осталась минута' : remaining <= 300_000 ? 'Осталось пять минут' : ''

    function select(answerIndex: number) {
        const next = { ...answers, [question.id]: answerIndex }
        setAnswers(next)
        saveAnswers(attemptId, next)
    }

    return (
        <div className="mx-auto max-w-2xl px-4 pb-10 pt-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-fg">Тест ПДД</h1>
                    <p className="text-xs text-muted">
                        Попытка {attemptNumber} из {maxAttempts}
                    </p>
                </div>
                <div role="timer" aria-live="off" className={`rounded-xl border border-line bg-surface px-3 py-1.5 text-lg font-bold tabular-nums ${remaining <= 60_000 ? 'text-danger' : 'text-fg'}`}>
                    {formatTimer(remaining)}
                </div>
            </div>
            <span className="sr-only" aria-live="polite">
        {warn}
      </span>

            <nav aria-label="Вопросы" className="mt-4 flex flex-wrap gap-1.5">
                {questions.map((q, i) => {
                    const answered = answers[q.id] !== undefined
                    return (
                        <button
                            key={q.id}
                            type="button"
                            aria-label={`Вопрос ${i + 1}${answered ? ', есть ответ' : ''}`}
                            aria-current={i === index ? 'step' : undefined}
                            onClick={() => setIndex(i)}
                            className={`size-9 rounded-full border text-sm transition-colors ${
                                i === index ? 'border-primary bg-primary text-primary-fg' : answered ? 'border-primary bg-accent text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'
                            }`}
                        >
                            {i + 1}
                        </button>
                    )
                })}
            </nav>

            <div className="mt-4">
                <QuestionCard question={question} index={index} total={questions.length} selected={answers[question.id]} disabled={locked} onSelect={select} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                    Назад
                </Button>
                <Button variant="outline" disabled={index === questions.length - 1} onClick={() => setIndex(index + 1)}>
                    Далее
                </Button>
            </div>

            <div className="mt-6 border-t border-line pt-5">
                {confirm && unanswered > 0 ? (
                    <div className="rounded-2xl border border-line bg-surface p-4">
                        <p className="text-sm text-fg">
                            Без ответа: {unanswered}. Они засчитаются как ошибки, а сдать тест можно не более чем с одной ошибкой. Завершить?
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            <Button variant="dark" loading={submit.isPending} onClick={send}>
                                Завершить
                            </Button>
                            <Button variant="outline" disabled={submit.isPending} onClick={() => setConfirm(false)}>
                                Вернуться
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button variant="dark" loading={submit.isPending} onClick={() => (unanswered > 0 ? setConfirm(true) : send())}>
                        {expired ? 'Отправить ответы' : 'Завершить тест'}
                    </Button>
                )}
                {unanswered > 0 && !confirm && <p className="mt-2 text-center text-xs text-muted">Без ответа: {unanswered}</p>}
            </div>
        </div>
    )
}