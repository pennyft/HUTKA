/** Типы из pddtest/dto/*.java и pddtest/enums/PddAttemptStatus.java. Даты приходят ISO-8601 (UTC). */
export type PddAttemptStatus = 'in_progress' | 'completed' | 'expired'

export interface PddCycle {
  maxAttempts: number
  /** Сколько попыток осталось в цикле. Идущая попытка уже посчитана как использованная. */
  attemptsLeft: number
  /** Когда откроется новый цикл. null, пока цикл открыт или идёт последняя попытка. */
  nextCycleAt: string | null
}

export interface PddDiscount {
  grantedAt: string
  expiresAt: string
  percent: number
}

export interface PddAttemptSummary {
  id: string
  attemptNumber: number
  cycleStartedAt: string
  startedAt: string
  submittedAt: string | null
  status: PddAttemptStatus
  /** У просроченной попытки бэк ставит число вопросов (все ошибки), поэтому в интерфейсе её ошибки не показываем. */
  errorsCount: number | null
  passed: boolean | null
}

/** GET /pddtest/attempts */
export interface PddHistory {
  cycle: PddCycle
  activeDiscount: PddDiscount | null
  /** Новые первыми (findByUserIdOrderByStartedAtDesc). */
  attempts: PddAttemptSummary[]
}

export interface PddQuestion {
  id: string
  text: string
  variants: string[]
}

/** GET /pddtest/questions: начинает попытку либо возвращает уже идущую (те же вопросы и тот же expiresAt). */
export interface PddSession {
  attemptId: string
  attemptNumber: number
  maxAttempts: number
  startedAt: string
  expiresAt: string
  questions: PddQuestion[]
}

export interface PddAnswer {
  questionId: string
  answerIndex: number
}

/** POST /pddtest/attempts */
export interface PddResult {
  attemptId: string
  attemptNumber: number
  errorsCount: number
  passed: boolean
  cycle: PddCycle
  discount: PddDiscount | null
}
