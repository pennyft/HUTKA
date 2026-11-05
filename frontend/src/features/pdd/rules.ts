/** Правила теста из pddtest/PddRules.java и BookingRules.PDD_DISCOUNT_RATE (0,10). Дублируют бэк только для подсказок в интерфейсе. */
export const PDD_RULES = {
  questions: 10,
  timeLimitMinutes: 15,
  maxErrors: 1,
  attemptsPerCycle: 3,
  discountPercent: 10,
  discountDays: 3,
} as const
