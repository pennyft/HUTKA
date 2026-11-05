/** Цифры номера карты: пробелы и дефисы допускаются и удаляются (как на бэке PartnerBankDetailsService). */
export const cardDigits = (s: string): string => s.replace(/[ -]/g, '')

export function cardProblem(s: string): string | null {
  return /^\d{16,19}$/.test(cardDigits(s)) ? null : 'Номер карты: от 16 до 19 цифр'
}

/** Имя держателя: 2–100 символов, начинается с буквы, дальше буквы, пробел, точка, апостроф, дефис (BankDetailsRequest). */
export function holderProblem(s: string): string | null {
  const t = s.trim()
  if (t.length < 2) return 'Укажите имя держателя (от 2 символов)'
  if (t.length > 100) return 'Не больше 100 символов'
  return /^[\p{L}][\p{L} .'-]*$/u.test(t) ? null : 'Допустимы буквы, пробел, точка, дефис и апостроф'
}

/** Пока вводят номер: группы по четыре цифры. Лишнее обрезаем до 19 цифр. */
export function formatCardInput(s: string): string {
  const d = s.replace(/\D/g, '').slice(0, 19)
  return d.replace(/(\d{4})(?=\d)/g, '$1 ')
}

export const PAYOUT_STATUS_LABEL = { pending: 'Ожидает выплаты', paid: 'Выплачено' } as const

/** «06.10 – 12.10.2026» из двух дат YYYY-MM-DD. */
export function periodText(start: string, end: string): string {
  const f = (iso: string) => /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  const a = f(start)
  const b = f(end)
  if (!a || !b) return `${start} – ${end}`
  return `${a[3]}.${a[2]} – ${b[3]}.${b[2]}.${b[1]}`
}
