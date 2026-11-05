import { PDD_RULES } from './rules'
import type { PddAnswer, PddAttemptSummary, PddHistory, PddQuestion } from './types'

/** Сколько миллисекунд осталось до момента iso. Некорректная дата даёт 0. */
export function remainingMs(iso: string, now: Date): number {
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? 0 : t - now.getTime()
}

/** Таймер теста: «14:05». Отрицательное время показывается как «00:00». */
export function formatTimer(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Сколько осталось действовать скидке: «2 д 5 ч», «3 ч 10 мин», «12 мин». */
export function formatLeft(ms: number): string {
  if (ms <= 0) return 'срок истёк'
  const minutes = Math.floor(ms / 60_000)
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  if (days > 0) return `${days} д ${hours} ч`
  if (hours > 0) return `${hours} ч ${mins} мин`
  if (mins > 0) return `${mins} мин`
  return 'меньше минуты'
}

/** Состояние главной страницы теста. */
export type HomeState =
  | { kind: 'resume' }
  | { kind: 'open'; attemptsLeft: number; maxAttempts: number }
  | { kind: 'passed'; nextCycleAt: string | null }
  | { kind: 'exhausted'; nextCycleAt: string | null }

/** Идёт ли попытка: её можно продолжить, даже если попытки цикла уже закончились (бэк сначала ищет идущую). */
export function hasOpenAttempt(h: PddHistory): boolean {
  return h.attempts.some((a) => a.status === 'in_progress')
}

/**
 * Что показать на главной. Как считает бэк (PddCycleCalculator): цикл открыт, только пока нет успешной попытки и использовано меньше трёх.
 * Поэтому после успешной сдачи новых попыток до следующего цикла нет, даже если из трёх использована одна.
 */
export function homeState(h: PddHistory): HomeState {
  if (hasOpenAttempt(h)) return { kind: 'resume' }
  if (h.cycle.attemptsLeft > 0) return { kind: 'open', attemptsLeft: h.cycle.attemptsLeft, maxAttempts: h.cycle.maxAttempts }
  const latest = h.attempts[0]?.cycleStartedAt
  const passedInCycle = latest !== undefined && h.attempts.some((a) => a.cycleStartedAt === latest && a.passed === true)
  return { kind: passedInCycle ? 'passed' : 'exhausted', nextCycleAt: h.cycle.nextCycleAt }
}

/** Подпись попытки в истории. Ошибки просроченной попытки не показываем: бэк записывает в них все вопросы. */
export function attemptLabel(a: PddAttemptSummary): { status: string; detail?: string } {
  if (a.status === 'in_progress') return { status: 'Идёт' }
  if (a.status === 'expired') return { status: 'Время вышло' }
  const errors = a.errorsCount ?? 0
  return { status: a.passed ? 'Пройден' : 'Не пройден', detail: `Ошибок: ${errors}` }
}

/** Ответы для отправки: только на отвеченные вопросы, в порядке вопросов. */
export function buildAnswers(questions: PddQuestion[], selected: Record<string, number>): PddAnswer[] {
  return questions.flatMap((q) => (selected[q.id] !== undefined ? [{ questionId: q.id, answerIndex: selected[q.id] }] : []))
}

export function unansweredCount(questions: PddQuestion[], selected: Record<string, number>): number {
  return questions.filter((q) => selected[q.id] === undefined).length
}

/** Оставляем только ответы на вопросы этой попытки с существующим вариантом (на случай устаревших сохранённых данных). */
export function sanitizeAnswers(questions: PddQuestion[], raw: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (typeof raw !== 'object' || raw === null) return out
  for (const q of questions) {
    const v = (raw as Record<string, unknown>)[q.id]
    if (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < q.variants.length) out[q.id] = v
  }
  return out
}

/** Склонение «ошибка»: 1 ошибка, 2 ошибки, 5 ошибок. */
export function errorsText(n: number): string {
  const m10 = n % 10
  const m100 = n % 100
  const word = m10 === 1 && m100 !== 11 ? 'ошибка' : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 'ошибки' : 'ошибок'
  return `${n} ${word}`
}

export const MAX_ERRORS_TEXT = `не больше ${PDD_RULES.maxErrors} ошибки`
