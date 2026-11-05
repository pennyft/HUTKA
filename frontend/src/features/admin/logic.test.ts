import { describe, expect, it } from 'vitest'
import { dayBars, describeActivity, formatDay, fullName, pageCount, parseUserFilters, passwordProblem, queueTiles, rangeText, reasonProblem, statusRows, userFiltersToParams, userFiltersToQuery } from './logic'

describe('списки', () => {
  it('диапазон и число страниц', () => {
    expect(rangeText(0, 20, 135)).toBe('1–20 из 135')
    expect(rangeText(6, 20, 135)).toBe('121–135 из 135')
    expect(rangeText(0, 20, 0)).toBe('нет записей')
    expect(pageCount(135, 20)).toBe(7)
    expect(pageCount(0, 20)).toBe(1)
    expect(pageCount(20, 20)).toBe(1)
  })
  it('имя', () => {
    expect(fullName({ firstName: 'Иван', lastName: 'Петров' })).toBe('Иван Петров')
  })
})

describe('причина и пароль', () => {
  it('причина обязательна, до 500', () => {
    expect(reasonProblem('  ')).toBe('Укажите причину')
    expect(reasonProblem('a'.repeat(500))).toBeNull()
    expect(reasonProblem('a'.repeat(501))).toMatch(/500/)
  })
  it('пароль: длина, байты, совпадение', () => {
    expect(passwordProblem('', 'x'.repeat(12), 'x'.repeat(12))).toMatch(/текущий/)
    expect(passwordProblem('old', 'short', 'short')).toMatch(/12/)
    expect(passwordProblem('old', 'x'.repeat(73), 'x'.repeat(73))).toMatch(/72 символов/)
    expect(passwordProblem('old', 'п'.repeat(40), 'п'.repeat(40))).toMatch(/72 байт/)
    expect(passwordProblem('same-password-1', 'same-password-1', 'same-password-1')).toMatch(/совпадает с текущим/)
    expect(passwordProblem('old-password-1', 'new-password-12', 'new-password-13')).toMatch(/не совпадают/)
    expect(passwordProblem('old-password-1', 'new-password-12', 'new-password-12')).toBeNull()
  })
})

describe('фильтры пользователей', () => {
  it('из адреса и обратно (страница с 1)', () => {
    const f = parseUserFilters(new URLSearchParams('status=pending&partner=yes&blocked=no&q=%D0%B8%D0%B2%D0%B0%D0%BD&page=3'))
    expect(f).toEqual({ verificationStatus: 'pending', partner: 'yes', blocked: 'no', q: 'иван', page: 2 })
    expect(userFiltersToParams(f)).toEqual({ status: 'pending', partner: 'yes', blocked: 'no', q: 'иван', page: '3' })
  })
  it('мусор в адресе даёт значения по умолчанию', () => {
    expect(parseUserFilters(new URLSearchParams('status=zzz&partner=maybe&page=-5'))).toEqual({ verificationStatus: '', partner: '', blocked: '', q: '', page: 0 })
    expect(userFiltersToParams({ verificationStatus: '', partner: '', blocked: '', q: '  ', page: 0 })).toEqual({})
  })
  it('запрос к API: да и нет в булевы', () => {
    expect(userFiltersToQuery({ verificationStatus: 'verified', partner: 'no', blocked: 'yes', q: ' ан ', page: 1 })).toEqual({ page: 1, verificationStatus: 'verified', partner: false, blocked: true, q: 'ан' })
    expect(userFiltersToQuery({ verificationStatus: '', partner: '', blocked: '', q: '', page: 0 })).toEqual({ page: 0 })
  })
})

describe('дашборд', () => {
  it('ряд по дням в столбцы', () => {
    expect(dayBars([{ date: '2026-10-05', value: 3 }, { date: 'x', value: 1 }])).toEqual([
      { key: '2026-10-05', label: '05.10', value: 3 },
      { key: 'x', label: 'x', value: 1 },
    ])
  })
  it('брони по статусам: известные по порядку, незнакомые не теряются', () => {
    expect(statusRows({ finished: 5, pending: 2, weird: 1 }).map((r) => r.label)).toEqual(['Ожидают', 'Завершены', 'weird'])
  })
  it('плитки очередей ведут на экраны очередей, срочные тикеты в примечании', () => {
    const t = queueTiles({ licenseRequests: 2, carModeration: 1, openDisputes: 0, openTickets: 4, urgentOpenTickets: 1 })
    expect(t.map((x) => x.to)).toEqual(['/admin/license-requests', '/admin/cars?moderationStatus=pending', '/admin/disputes', '/admin/tickets'])
    expect(t[3].note).toBe('срочных: 1')
    expect(t[0].note).toBeUndefined()
  })
  it('лента событий', () => {
    expect(describeActivity({ type: 'booking_created', at: 'x', entityId: 'b1', label: 'l' })).toEqual({ title: 'Новая бронь', to: '/admin/bookings/b1' })
    expect(describeActivity({ type: 'user_registered', at: 'x', entityId: 'u1', label: 'l' }).to).toBe('/admin/users/u1')
    expect(describeActivity({ type: 'новое', at: 'x', entityId: 'e', label: 'l' })).toEqual({ title: 'новое', to: null })
  })
})

describe('даты', () => {
  it('день без времени и без сдвига пояса', () => {
    expect(formatDay('2026-10-20')).toBe('20 октября 2026 г.')
    expect(formatDay(null)).toBe('—')
    expect(formatDay('мусор')).toBe('мусор')
  })
})
