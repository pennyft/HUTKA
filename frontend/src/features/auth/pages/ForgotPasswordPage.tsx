import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router'
import { authApi } from '../api'
import { errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { TextField } from '@/shared/ui/fields'
import { toast } from '@/shared/ui/toast'

const schema = z.object({
  email: z.string().trim().min(1, 'Введите email').max(254, 'Не больше 254 символов').email('Введите корректный email'),
})
type FormValues = z.infer<typeof schema>

/**
 * A5. Забыли пароль → POST /auth/forgot-password {email} (200 без тела).
 * Бэк отвечает 200 и для несуществующего email (чтобы нельзя было перебирать адреса), поэтому текст
 * после отправки не утверждает, что письмо ушло. 429 «Слишком много попыток» (3 запроса в час на email)
 * показываем как есть. Ссылка в письме живёт 1 час и ведёт на /reset-password?token=...
 */
export default function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit({ email }: FormValues) {
    try {
      await authApi.forgotPassword(email)
      setSentTo(email)
    } catch (e) {
      toast.error(errorMessage(e))
    }
  }

  if (sentTo) {
    return (
      <div>
        <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-fg">Запрос принят</span>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-fg">Проверьте почту</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Если аккаунт с адресом <span className="font-semibold text-fg">{sentTo}</span> существует, мы отправили на него ссылку для
          сброса пароля. Она действует 1 час.
        </p>
        <p className="mt-6 text-sm text-muted">
          Письмо не пришло? Проверьте папку «Спам» или{' '}
          <button type="button" onClick={() => setSentTo(null)} className="font-medium text-fg underline hover:opacity-80">
            введите адрес ещё раз
          </button>
          .
        </p>
        <p className="mt-4 text-sm">
          <Link to="/login" className="text-muted underline hover:opacity-80">
            Вернуться ко входу
          </Link>
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Забыли пароль?</h1>
        <p className="mt-1 text-sm text-muted">Введите email, и мы отправим ссылку для создания нового пароля.</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <TextField label="Email" type="email" placeholder="name@example.com" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <div className="pt-2">
          <Button type="submit" loading={isSubmitting}>
            {isSubmitting ? 'Отправляем…' : 'Отправить ссылку'}
          </Button>
        </div>
        <p className="pt-2 text-center text-sm text-muted">
          <Link to="/login" className="underline hover:opacity-80">
            Вернуться ко входу
          </Link>
        </p>
      </form>
    </>
  )
}
