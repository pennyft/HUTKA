import { sameScheduleJson } from './schedule'
import type { PartnerCar, UpdateCarBody } from './types'

export interface EditValues {
  pricePerHour: number
  address: string
  bookingMode: PartnerCar['bookingMode']
  description: string
}

const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

/**
 * Тело PATCH только из изменённых полей: бэк не меняет то, чего нет в теле (UpdateCarRequest). Сравнение идёт с текущими
 * значениями, которые бэк теперь отдаёт (в том числе описание и расписание). Пустое новое описание в тело не попадает:
 * так нельзя случайно стереть описание. schedule это JSON нового расписания либо null, если партнёр его не включал;
 * совпадающее с текущим расписание тоже не отправляется. Пустой результат значит, что менять нечего.
 */
export function buildUpdateBody(original: PartnerCar, v: EditValues, photos: string[], schedule: string | null): UpdateCarBody {
  const body: UpdateCarBody = {}
  if (v.pricePerHour !== original.pricePerHour) body.pricePerHour = v.pricePerHour
  const address = v.address.trim()
  if (address !== original.address) body.address = address
  if (v.bookingMode !== original.bookingMode) body.bookingMode = v.bookingMode
  if (!sameList(photos, original.photos)) body.photos = photos
  const description = v.description.trim()
  if (description && description !== (original.description ?? '').trim()) body.description = description
  if (schedule && !sameScheduleJson(schedule, original.availabilitySchedule)) body.availabilitySchedule = schedule
  return body
}

export const isEmptyUpdate = (b: UpdateCarBody): boolean => Object.keys(b).length === 0
