import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Mail } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store'
import { errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'
import { toast } from '@/shared/ui/toast'

const schema = z.object({
  email: z.string().trim().min(1, 'Обязательное поле').email('Введите корректный email'),
  code: z.string().regex(/^\d{6}$/, 'Код состоит из 6 цифр'),
})
type FormValues = z.infer<typeof schema>

/**
 * A3. Код из письма. POST /auth/verify-email → токен → GET /users/me → кабинет.
 * Email приходит из A2 или A4 через location.state; если страницу обновили, состояние пропадёт,
 * поэтому поле email показывается, когда адреса нет.
 */
export default function VerifyEmailPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const setToken = useAuthStore((s) => s.setToken)
  const stateEmail = (useLocation().state as { email?: string } | null)?.email ?? ''
  const [resending, setResending] = useState(false)
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: stateEmail, code: '' } })

  async function onSubmit(values: FormValues) {
    try {
      const { token } = await authApi.verifyEmail(values)
      setToken(token)
      await qc.fetchQuery({ queryKey: ['me'], queryFn: authApi.me })
      navigate('/app', { replace: true })
    } catch (e) {
      // 400 «Неверный или истёкший код»
      setError('code', { message: errorMessage(e) })
    }
  }

  async function resend() {
    const email = getValues('email').trim()
    if (!email) {
      setError('email', { message: 'Введите email' })
      return
    }
    setResending(true)
    try {
      await authApi.resendCode(email)
      toast.success('Код отправлен повторно.')
    } catch (e) {
      toast.error(errorMessage(e))
    } finally {
      setResending(false)
    }
  }

  return (
    <>
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg">
          <Mail className="size-6" aria-hidden />
        </div>
        <h1 className="text-xl font-bold text-fg">Подтвердите email</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {stateEmail ? (
            <>
              Мы отправили код на <span className="font-semibold text-fg">{stateEmail}</span>
            </>
          ) : (
            'Введите email и код из письма.'
          )}
        </p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {!stateEmail && <TextField label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />}
        <TextField
          label="Код из письма"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          error={errors.code?.message}
          {...register('code')}
        />
        <Button type="submit" loading={isSubmitting}>
          Подтвердить
        </Button>
        <p className="pt-1 text-center text-sm text-muted">
          Не пришёл код?{' '}
          <button type="button" onClick={resend} disabled={resending} className="font-medium text-fg underline hover:opacity-80 disabled:opacity-60">
            Отправить ещё раз
          </button>
        </p>
        <p className="text-center text-sm text-muted">
          <Link to="/login" className="underline hover:opacity-80">
            Вернуться ко входу
          </Link>
        </p>
      </form>
    </>
  )
}
