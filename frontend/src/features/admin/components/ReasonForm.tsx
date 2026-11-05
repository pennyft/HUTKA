import { useState } from 'react'
import { Button } from '@/shared/ui/Button'
import { reasonProblem, REASON_MAX } from '../logic'

interface Props {
  label: string
  submitLabel: string
  loading: boolean
  onSubmit: (reason: string) => void
  onCancel: () => void
}

/** Встроенная форма причины для опасных действий (блокировка, отклонение): причина обязательна, до 500 символов. */
export function ReasonForm({ label, submitLabel, loading, onSubmit, onCancel }: Props) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const id = `reason-${label}`
  return (
    <div className="rounded-2xl border border-line bg-surface-2 p-3">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-fg">
        {label}
      </label>
      <textarea
        id={id}
        value={reason}
        rows={3}
        maxLength={REASON_MAX}
        onChange={(e) => setReason(e.target.value)}
        className="w-full resize-none rounded-xl border border-line bg-surface px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      <div className="mt-2 grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="dark"
          loading={loading}
          onClick={() => {
            const p = reasonProblem(reason)
            setError(p)
            if (!p) onSubmit(reason.trim())
          }}
        >
          {submitLabel}
        </Button>
        <Button type="button" variant="outline" disabled={loading} onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </div>
  )
}
