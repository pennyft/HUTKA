import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { PasswordField } from '@/shared/ui/fields'
import { toast } from '@/shared/ui/toast'
import { adminApi } from '../api'
import { passwordProblem } from '../logic'

/**
 * AD20. Смена пароля администратора: POST /admin/auth/change-password → 204. Новый пароль от 12 до 72 символов и не равен текущему.
 * Лимит бэка: 5 попыток за 15 минут (при превышении 429). Сессия после смены остаётся действующей.
 */
export default function AdminChangePasswordPage() {
    const [current, setCurrent] = useState('')
    const [next, setNext] = useState('')
    const [repeat, setRepeat] = useState('')
    const [problem, setProblem] = useState<string | null>(null)

    const change = useMutation({
        mutationFn: () => adminApi.changePassword(current, next),
        onSuccess: () => {
            toast.success('Пароль изменён.')
            setCurrent('')
            setNext('')
            setRepeat('')
        },
    })

    function submit(e: FormEvent) {
        e.preventDefault()
        const p = passwordProblem(current, next, repeat)
        setProblem(p)
        if (!p) change.mutate()
    }

    return (
        <div className="mx-auto max-w-md px-4 pb-10 pt-6">
            <h1 className="text-2xl font-bold tracking-tight text-fg">Смена пароля</h1>
            <p className="mt-1 text-sm text-muted">Новый пароль: от 12 до 72 символов.</p>
            <form onSubmit={submit} noValidate className="mt-5 space-y-4 rounded-3xl border border-line bg-surface p-5">
                <PasswordField label="Текущий пароль" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
                <PasswordField label="Новый пароль" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
                <PasswordField label="Повторите новый пароль" autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
                {(problem || change.isError) && (
                    <p role="alert" className="rounded-xl border border-danger/40 bg-surface-2 p-3 text-sm text-fg">
                        {problem ?? errorMessage(change.error)}
                    </p>
                )}
                <Button type="submit" variant="dark" loading={change.isPending}>
                    Сменить пароль
                </Button>
            </form>
        </div>
    )
}