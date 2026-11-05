import { http } from '@/api/http'
import type { Booking } from '../types'

export const tripApi = {
  /**
   * POST /bookings/{id}/start {photosBefore}. Минимум 1 фото, не больше 20, каждая ссылка https до 1024 символов с разрешённого хоста
   * (иначе 400 «Недопустимая ссылка на фото»). Пустой массив бэк не принимает (@NotEmpty): в документе это указано неверно.
   * 409: бронь не подтверждена партнёром, время старта ещё не пришло, машина не в статусе reserved.
   */
  start: (id: string, photosBefore: string[]) => http.request<Booking>(`/bookings/${id}/start`, { method: 'POST', body: { photosBefore } }),

  /**
   * POST /bookings/{id}/finish {photosAfter}. Правила по фото те же. Бэк считает итог, применяет скидку ПДД,
   * запускает списание и отправку PDF-договора на почту арендатора. 409, если поездка не идёт.
   */
  finish: (id: string, photosAfter: string[]) => http.request<Booking>(`/bookings/${id}/finish`, { method: 'POST', body: { photosAfter } }),
}
