import { describe, expect, it } from 'vitest'
import { attemptLabel, buildAnswers, errorsText, formatLeft, formatTimer, hasOpenAttempt, homeState, remainingMs, sanitizeAnswers, unansweredCount } from './logic'
import type { PddAttemptSummary, PddHistory, PddQuestion } from './types'

const attempt = (over: Partial<PddAttemptSummary>): PddAttemptSummary => ({
  id: 'a',
  attemptNumber: 1,
  cycleStartedAt: '2026-10-01T10:00:00Z',
  startedAt: '2026-10-01T10:00:00Z',
  submittedAt: null,
  status: 'completed',
  errorsCount: 0,
  passed: false,
  ...over,
})

const history = (attempts: PddAttemptSummary[], attemptsLeft: number, nextCycleAt: string | null = null): PddHistory => ({
  cycle: { maxAttempts: 3, attemptsLeft, nextCycleAt },
  activeDiscount: null,
  attempts,
})

const questions: PddQuestion[] = [
  { id: 'q1', text: 'a', variants: ['x', 'y', 'z'] },
  { id: 'q2', text: 'b', variants: ['x', 'y'] },
  { id: 'q3', text: 'c', variants: ['x', 'y'] },
]

describe('время', () => {
  it('remainingMs', () => {
    expect(remainingMs('2026-10-20T12:15:00Z', new Date('2026-10-20T12:00:00Z'))).toBe(15 * 60_000)
    expect(remainingMs('мусор', new Date())).toBe(0)
  })
  it('таймер', () => {
    expect(formatTimer(15 * 60_000)).toBe('15:00')
    expect(formatTimer(61_000)).toBe('01:01')
    expect(formatTimer(500)).toBe('00:01')
    expect(formatTimer(-5000)).toBe('00:00')
  })
  it('сколько осталось скидке', () => {
    expect(formatLeft(0)).toBe('срок истёк')
    expect(formatLeft(30_000)).toBe('меньше минуты')
    expect(formatLeft(12 * 60_000)).toBe('12 мин')
    expect(formatLeft((3 * 60 + 10) * 60_000)).toBe('3 ч 10 мин')
    expect(formatLeft((2 * 24 * 60 + 5 * 60) * 60_000)).toBe('2 д 5 ч')
  })
})

describe('главная страница', () => {
  it('идущая попытка важнее всего, даже если попыток не осталось', () => {
    const h = history([attempt({ status: 'in_progress', passed: null, errorsCount: null })], 0)
    expect(hasOpenAttempt(h)).toBe(true)
    expect(homeState(h)).toEqual({ kind: 'resume' })
  })
  it('новый пользователь: три попытки', () => {
    expect(homeState(history([], 3))).toEqual({ kind: 'open', attemptsLeft: 3, maxAttempts: 3 })
  })
  it('после неудачи есть ещё попытки', () => {
    expect(homeState(history([attempt({})], 2))).toEqual({ kind: 'open', attemptsLeft: 2, maxAttempts: 3 })
  })
  it('после успешной сдачи цикл закрыт до следующего месяца', () => {
    const h = history([attempt({ passed: true })], 0, '2026-11-01T10:00:00Z')
    expect(homeState(h)).toEqual({ kind: 'passed', nextCycleAt: '2026-11-01T10:00:00Z' })
  })
  it('три неудачи: попытки закончились', () => {
    const h = history([attempt({ attemptNumber: 3 }), attempt({ attemptNumber: 2 }), attempt({ attemptNumber: 1 })], 0, '2026-11-01T10:00:00Z')
    expect(homeState(h)).toEqual({ kind: 'exhausted', nextCycleAt: '2026-11-01T10:00:00Z' })
  })
  it('успех в прошлом цикле не считается успехом в текущем', () => {
    const old = attempt({ cycleStartedAt: '2026-08-01T10:00:00Z', passed: true })
    const cur = [attempt({ attemptNumber: 3 }), attempt({ attemptNumber: 2 }), attempt({ attemptNumber: 1 })]
    expect(homeState(history([...cur, old], 0, '2026-11-01T10:00:00Z')).kind).toBe('exhausted')
  })
})

describe('подписи попыток', () => {
  it('статусы', () => {
    expect(attemptLabel(attempt({ status: 'in_progress' })).status).toBe('Идёт')
    expect(attemptLabel(attempt({ status: 'expired', errorsCount: 10 }))).toEqual({ status: 'Время вышло' })
    expect(attemptLabel(attempt({ passed: true, errorsCount: 1 }))).toEqual({ status: 'Пройден', detail: 'Ошибок: 1' })
    expect(attemptLabel(attempt({ passed: false, errorsCount: 4 }))).toEqual({ status: 'Не пройден', detail: 'Ошибок: 4' })
  })
  it('склонение', () => {
    expect([0, 1, 2, 5, 11, 12, 21].map(errorsText)).toEqual(['0 ошибок', '1 ошибка', '2 ошибки', '5 ошибок', '11 ошибок', '12 ошибок', '21 ошибка'])
  })
})

describe('ответы', () => {
  it('отправляются только отвеченные, в порядке вопросов', () => {
    expect(buildAnswers(questions, { q3: 1, q1: 0 })).toEqual([
      { questionId: 'q1', answerIndex: 0 },
      { questionId: 'q3', answerIndex: 1 },
    ])
    expect(unansweredCount(questions, { q1: 2 })).toBe(2)
  })
  it('ноль это тоже ответ', () => {
    expect(unansweredCount(questions, { q1: 0, q2: 0, q3: 0 })).toBe(0)
  })
  it('сохранённые ответы очищаются от лишнего', () => {
    expect(sanitizeAnswers(questions, { q1: 2, q2: 5, q3: 'x', other: 1 })).toEqual({ q1: 2 })
    expect(sanitizeAnswers(questions, null)).toEqual({})
  })
})
