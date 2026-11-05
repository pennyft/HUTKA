import { describe, expect, it } from 'vitest'
import { emptySchedule, parseSchedule, sameScheduleJson, scheduleToJson, timeOptions, toMinutes, uniformSchedule, validateSchedule } from './schedule'

describe('время', () => {
  it('минуты: начало до 23:59, конец до 24:00', () => {
    expect(toMinutes('08:30', false)).toBe(510)
    expect(toMinutes('24:00', true)).toBe(1440)
    expect(toMinutes('24:00', false)).toBeNull()
    expect(toMinutes('25:00', true)).toBeNull()
    expect(toMinutes('08:60', false)).toBeNull()
    expect(toMinutes('8:30', false)).toBeNull()
  })
  it('варианты в выпадающем списке с шагом 30 минут', () => {
    expect(timeOptions(false)[0]).toBe('00:00')
    expect(timeOptions(false).at(-1)).toBe('23:30')
    expect(timeOptions(true)[0]).toBe('00:30')
    expect(timeOptions(true).at(-1)).toBe('24:00')
    expect(timeOptions(false)).toHaveLength(48)
  })
})

describe('проверка расписания', () => {
  it('одно окно в день проходит', () => {
    expect(validateSchedule(uniformSchedule({ from: '08:00', to: '22:00' }))).toBeNull()
    expect(validateSchedule(uniformSchedule({ from: '00:00', to: '24:00' }))).toBeNull()
  })
  it('без окон вообще: смысла нет', () => {
    expect(validateSchedule(emptySchedule())).toMatch(/хотя бы одно окно/)
  })
  it('конец раньше начала и равный началу', () => {
    const d = emptySchedule()
    d.mon = [{ from: '12:00', to: '10:00' }]
    expect(validateSchedule(d)).toBe('Пн: конец окна должен быть позже начала.')
    d.mon = [{ from: '12:00', to: '12:00' }]
    expect(validateSchedule(d)).toMatch(/позже/)
  })
  it('пересечение окон, а касание допустимо', () => {
    const d = emptySchedule()
    d.tue = [
      { from: '08:00', to: '12:00' },
      { from: '11:00', to: '14:00' },
    ]
    expect(validateSchedule(d)).toBe('Вт: окна пересекаются.')
    d.tue = [
      { from: '14:00', to: '18:00' },
      { from: '08:00', to: '14:00' },
    ]
    expect(validateSchedule(d)).toBeNull()
  })
  it('не больше десяти окон в день', () => {
    const d = emptySchedule()
    d.wed = Array.from({ length: 11 }, () => ({ from: '08:00', to: '09:00' }))
    expect(validateSchedule(d)).toBe('Ср: не больше 10 окон в день.')
  })
})

describe('JSON для бэка', () => {
  it('выключено: не отправляем', () => {
    expect(scheduleToJson(uniformSchedule({ from: '08:00', to: '22:00' }), false)).toBeNull()
  })
  it('включено: все семь дней, у недоступных пустой массив', () => {
    const d = emptySchedule()
    d.mon = [{ from: '08:00', to: '22:00' }]
    const parsed = JSON.parse(scheduleToJson(d, true)!)
    expect(Object.keys(parsed)).toEqual(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])
    expect(parsed.mon).toEqual([{ from: '08:00', to: '22:00' }])
    expect(parsed.sun).toEqual([])
  })
})


describe('расписание из ответа бэка', () => {
  it('разбирается в черновик редактора', () => {
    const d = parseSchedule('{"mon":[{"from":"08:00","to":"22:00"}],"sun":[]}')!
    expect(d.mon).toEqual([{ from: '08:00', to: '22:00' }])
    expect(d.sun).toEqual([])
    expect(d.tue).toEqual([])
  })
  it('нет расписания или мусор: null, форма не падает', () => {
    expect(parseSchedule(null)).toBeNull()
    expect(parseSchedule('')).toBeNull()
    expect(parseSchedule('не json')).toBeNull()
    expect(parseSchedule('[]')).toBeNull()
    expect(parseSchedule('"x"')).toBeNull()
  })
  it('битые окна отбрасываются, остальное остаётся', () => {
    const d = parseSchedule('{"mon":[{"from":"08:00","to":"22:00"},{"from":8},null,"x"],"tue":"нет"}')!
    expect(d.mon).toEqual([{ from: '08:00', to: '22:00' }])
    expect(d.tue).toEqual([])
  })
  it('сравнение не зависит от порядка ключей и пробелов', () => {
    const a = '{"mon":[{"from":"08:00","to":"22:00"}],"tue":[]}'
    const b = '{ "tue": [], "mon": [ { "to": "22:00", "from": "08:00" } ] }'
    expect(sameScheduleJson(a, b)).toBe(true)
    expect(sameScheduleJson(a, '{"mon":[{"from":"09:00","to":"22:00"}]}')).toBe(false)
    expect(sameScheduleJson(null, null)).toBe(true)
    expect(sameScheduleJson(a, null)).toBe(false)
  })
  it('круговая проверка: разбор и обратная сборка дают то же расписание', () => {
    const d = uniformSchedule({ from: '08:00', to: '22:00' })
    expect(parseSchedule(scheduleToJson(d, true))).toEqual(d)
  })
})
