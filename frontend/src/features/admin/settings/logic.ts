export interface SettingsValues {
  commissionPercent: string
  minRatingThreshold: string
  minRatingsCount: string
}
export interface SettingsData {
  commissionPercent: number
  minRatingThreshold: number
  minRatingsCount: number
}
export interface SettingsBody {
  commissionPercent?: number
  minRatingThreshold?: number
  minRatingsCount?: number
}

export const toValues = (s: SettingsData): SettingsValues => ({
  commissionPercent: String(s.commissionPercent).replace('.', ','),
  minRatingThreshold: String(s.minRatingThreshold).replace('.', ','),
  minRatingsCount: String(s.minRatingsCount),
})

/** «12,5» и «12.5» одинаково, не больше двух знаков. Пусто и мусор дают NaN. */
export const parseDecimal = (s: string): number => (/^\d+([.,]\d{1,2})?$/.test(s.trim()) ? Number(s.trim().replace(',', '.')) : NaN)

/** Границы из UpdateSettingsRequest: комиссия 0–100, порог рейтинга 1–5, минимум оценок целое не меньше 1. */
export function settingsProblems(v: SettingsValues): Partial<Record<keyof SettingsValues, string>> {
  const out: Partial<Record<keyof SettingsValues, string>> = {}
  const c = parseDecimal(v.commissionPercent)
  if (Number.isNaN(c) || c < 0 || c > 100) out.commissionPercent = 'Комиссия: число от 0 до 100, до двух знаков'
  const t = parseDecimal(v.minRatingThreshold)
  if (Number.isNaN(t) || t < 1 || t > 5) out.minRatingThreshold = 'Порог рейтинга: число от 1 до 5, до двух знаков'
  if (!/^\d+$/.test(v.minRatingsCount.trim()) || Number(v.minRatingsCount) < 1) out.minRatingsCount = 'Минимум оценок: целое число не меньше 1'
  return out
}

/** Тело PATCH только из изменённых полей (PATCH без параметров бэк отклоняет с 400). Вызывать после проверки settingsProblems. */
export function buildSettingsBody(orig: SettingsData, v: SettingsValues): SettingsBody {
  const body: SettingsBody = {}
  const c = parseDecimal(v.commissionPercent)
  const t = parseDecimal(v.minRatingThreshold)
  const n = Number(v.minRatingsCount)
  if (c !== orig.commissionPercent) body.commissionPercent = c
  if (t !== orig.minRatingThreshold) body.minRatingThreshold = t
  if (n !== orig.minRatingsCount) body.minRatingsCount = n
  return body
}
export const isEmptyBody = (b: SettingsBody): boolean => Object.keys(b).length === 0
