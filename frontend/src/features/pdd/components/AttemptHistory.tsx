import { formatDateTime } from '@/shared/lib/format'
import { attemptLabel } from '../logic'
import type { PddAttemptSummary } from '../types'

/** История попыток (новые первыми). У идущей попытки даты завершения ещё нет. */
export function AttemptHistory({ attempts }: { attempts: PddAttemptSummary[] }) {
  if (attempts.length === 0) return <p className="text-sm text-muted">Попыток пока не было.</p>
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
      {attempts.map((a) => {
        const label = attemptLabel(a)
        return (
          <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0">
              <p className="font-medium text-fg">Попытка {a.attemptNumber}</p>
              <p className="text-xs text-muted">{formatDateTime(a.startedAt)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-medium text-fg">{label.status}</p>
              {label.detail && <p className="text-xs text-muted">{label.detail}</p>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
