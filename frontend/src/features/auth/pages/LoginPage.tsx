import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api'
import { useAuthStore } from '../store'
import { ApiError, errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { PasswordField, TextField } from '@/shared/ui/fields'

const schema = z.object({
  email: z.string().trim().min(1, 'Введите email').email('Введите корректный email'),
  password: z.string().min(1, 'Введите пароль'),
})
type FormValues = z.infer<typeof schema>

/**
 * A4. Вход. Ответы бэка: 401 неверные данные; 403 «Подтвердите email перед входом» → экран A3;
 * 403 «Аккаунт заблокирован. Причина: …» → показываем как есть.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const setToken = useAuthStore((s) => s.setToken)
  const [serverError, setServerError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      const { token } = await authApi.login(values)
      setToken(token)
      await qc.fetchQuery({ queryKey: ['me'], queryFn: authApi.me })
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/app', { replace: true })
    } catch (e) {
      // Распознавание по тексту сообщения хрупкое: при смене текста на бэке перестанет срабатывать.
      if (e instanceof ApiError && e.status === 403 && e.message.includes('Подтвердите email')) {
        navigate('/verify-email', { state: { email: values.email } })
        return
      }
      setServerError(errorMessage(e))
    }
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Вход</h1>
        <p className="mt-1 text-sm text-muted">С возвращением в HUTKA.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <TextField label="Email" type="email" placeholder="name@example.com" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <PasswordField label="Пароль" placeholder="Введите пароль" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
        {serverError && <p className="text-sm text-danger">{serverError}</p>}
        <div className="pt-2">
          <Button type="submit" loading={isSubmitting}>
            Войти
          </Button>
        </div>
        <p className="pt-2 text-center text-sm text-muted">
          <Link to="/forgot-password" className="underline hover:opacity-80">
            Забыли пароль?
          </Link>
          {' · '}
          <Link to="/register" className="underline hover:opacity-80">
            Регистрация
          </Link>
        </p>
      </form>
    </>
  )
}
