import { CircleAlert, CircleCheck } from 'lucide-react'
import { Link } from 'react-router'
import { formatDateTime } from '@/shared/lib/format'
import { errorsText } from '../logic'
import { PDD_RULES } from '../rules'
import type { PddResult } from '../types'

const primaryLink = 'inline-block rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover'
const outlineLink = 'inline-block rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-fg transition-colors hover:bg-surface-2'

/** Итог после POST /pddtest/attempts. */
export function TestResult({ result }: { result: PddResult }) {
  const { passed, errorsCount, discount, cycle } = result
  return (
    <div className="rounded-3xl border border-line bg-surface p-8">
      {passed ? <CircleCheck className="mb-3 size-8 text-fg" aria-hidden /> : <CircleAlert className="mb-3 size-8 text-danger" aria-hidden />}
      <h1 className="text-2xl font-bold tracking-tight text-fg">{passed ? 'Тест сдан' : 'Тест не сдан'}</h1>
      <p className="mt-2 text-sm text-muted">
        {errorsText(errorsCount)}. Проходной результат: не больше {PDD_RULES.maxErrors}.
      </p>
      {passed && discount && (
        <p className="mt-3 text-sm text-fg">
          Скидка {discount.percent}% действует до {formatDateTime(discount.expiresAt)} и применится к ближайшей брони при завершении поездки.
        </p>
      )}
      {!passed && (
        <p className="mt-3 text-sm text-muted">
          {cycle.attemptsLeft > 0
            ? `Осталось попыток: ${cycle.attemptsLeft} из ${cycle.maxAttempts}.`
            : cycle.nextCycleAt
              ? `Попытки закончились. Новый цикл откроется ${formatDateTime(cycle.nextCycleAt)}.`
              : 'Попытки в этом цикле закончились.'}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        {passed && (
          <Link to="/cars" className={primaryLink}>
            Выбрать машину
          </Link>
        )}
        <Link to="/app/pdd" className={passed ? outlineLink : primaryLink}>
          К результатам
        </Link>
      </div>
    </div>
  )
}
