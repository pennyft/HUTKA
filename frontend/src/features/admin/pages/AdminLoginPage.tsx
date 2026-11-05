import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { Logo } from '@/shared/nav/Logo'
import { Button } from '@/shared/ui/Button'
import { PasswordField, TextField } from '@/shared/ui/fields'
import { adminApi } from '../api'
import { loadAdminSession } from '../session'
import { useAdminStore } from '../store'

/**
 * AD1. Вход администратора: POST /admin/auth/login {email, password}. Сессия живёт в cookie JSESSIONID, фронт хранит только csrfToken
 * из ответа. 401 «Неверный email или пароль»; после 5 неудачных попыток за 15 минут 429 «Слишком много попыток». Если сессия уже есть
 * (cookie жива), вход пропускается: при открытии страницы она проверяется через GET /admin/auth/me.
 */
export default function AdminLoginPage() {
    const status = useAdminStore((s) => s.status)
    const setSession = useAdminStore((s) => s.setSession)
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [touched, setTouched] = useState(false)

    useEffect(() => {
        if (status === 'unknown') void loadAdminSession()
    }, [status])

    const login = useMutation({
        mutationFn: () => adminApi.login(email.trim(), password),
        onSuccess: (s) => {
            setSession({ id: s.id, email: s.email, displayName: s.displayName }, s.csrfToken)
            navigate('/admin', { replace: true })
        },
    })

    if (status === 'authed') return <Navigate to="/admin" replace />

    const emailError = touched && !email.trim() ? 'Введите email' : undefined
    const passwordError = touched && !password ? 'Введите пароль' : undefined

    function submit(e: FormEvent) {
        e.preventDefault()
        setTouched(true)
        if (!email.trim() || !password) return
        login.mutate()
    }

    return (
        <main className="flex min-h-screen items-center justify-center px-4 py-10">
            <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 sm:p-8">
                <Logo to="/admin/login" tag="Админ" />
                <h1 className="mt-6 text-2xl font-bold tracking-tight text-fg">Вход для администратора</h1>
                <form onSubmit={submit} noValidate className="mt-5 space-y-4">
                    <TextField label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} error={emailError} />
                    <PasswordField label="Пароль" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={passwordError} />
                    {login.isError && (
                        <p role="alert" className="rounded-xl border border-danger/40 bg-surface-2 p-3 text-sm text-fg">
                            {errorMessage(login.error)}
                        </p>
                    )}
                    <Button type="submit" variant="dark" loading={login.isPending}>
                        Войти
                    </Button>
                </form>
            </div>
        </main>
    )
}