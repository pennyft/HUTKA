import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { Button } from '@/shared/ui/Button'
import { toast } from '@/shared/ui/toast'
import { bookingsApi, type RatingTarget } from '../api'

const COMMENT_MAX = 1000

const TITLE: Record<RatingTarget, string> = {
  car: 'Оцените машину',
  user: 'Оцените владельца',
}

/** Выбор оценки 1–5 звёздами: группа радиокнопок, управляется и мышью, и клавиатурой (Tab, пробел). */
function StarInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} из 5`}
          onClick={() => onChange(n)}
          className="flex size-10 items-center justify-center rounded-xl transition-colors hover:bg-surface-2"
        >
          <Star className={`size-6 ${n <= value ? 'fill-primary text-primary' : 'text-muted'}`} aria-hidden />
        </button>
      ))}
    </div>
  )
}

/**
 * Оценка по завершённой поездке (POST /ratings). Бэк отдаёт арендатору обе оценки: машине и владельцу,
 * каждая отправляется отдельно. Комментарий необязателен, до 1000 символов.
 */
export function RatingForm({ bookingId, target }: { bookingId: string; target: RatingTarget }) {
  const qc = useQueryClient()
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  const send = useMutation({
    mutationFn: () => bookingsApi.createRating({ bookingId, target, score, comment: comment.trim() || undefined }),
    onSuccess: () => {
      toast.success('Спасибо, оценка сохранена.')
      qc.invalidateQueries({ queryKey: ['ratings'] })
    },
    onError: (e) => setError(errorMessage(e)),
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (score < 1) {
      setError('Поставьте оценку от 1 до 5')
      return
    }
    send.mutate()
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="font-semibold text-fg">{TITLE[target]}</h3>
      <div className="mt-2">
        <StarInput value={score} onChange={setScore} label={TITLE[target]} />
      </div>
      <label htmlFor={`comment-${target}`} className="sr-only">
        Комментарий
      </label>
      <textarea
        id={`comment-${target}`}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={COMMENT_MAX}
        rows={3}
        placeholder="Комментарий (необязательно)"
        className="mt-2 w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-3 sm:max-w-[12rem]">
        <Button type="submit" loading={send.isPending}>
          Отправить
        </Button>
      </div>
    </form>
  )
}
