import { http } from '@/api/http'
import type { Booking, BookingStatus, WeatherWindow } from './types'

export interface CreateBookingBody {
    carId: string
    plannedStartAt: string
    plannedEndAt: string
}

export type RatingTarget = 'car' | 'user'

/** Элемент GET /ratings/pending: оценка, которую пользователь ещё должен оставить. Арендатору приходят обе: машина и владелец. */
export interface PendingRating {
    bookingId: string
    carId: string
    target: RatingTarget
    finishedAt: string
}

export interface CreateRatingBody {
    bookingId: string
    target: RatingTarget
    score: number
    comment?: string
}

export const bookingsApi = {
    /**
     * POST /bookings. Ошибки приходят с русским текстом в message:
     * 400 (прошлое время, начало ближе 6 часов для заявки, своя машина, слишком длительная аренда),
     * 403 (не verified или рейтинг ниже порога), 404, 409 (машина скрыта, занято, вне расписания).
     */
    create: (body: CreateBookingBody) => http.request<Booking>('/bookings', { method: 'POST', body }),

    /** GET /bookings: все брони арендатора (массив без страниц, новые первыми). Без status приходят все статусы. */
    list: (status?: BookingStatus, signal?: AbortSignal) => http.request<Booking[]>('/bookings', { query: { status }, signal }),

    /** GET /bookings/{id}: доступно арендатору и владельцу машины. */
    get: (id: string, signal?: AbortSignal) => http.request<Booking>(`/bookings/${id}`, { signal }),

    /** POST /bookings/{id}/cancel: только пока поездка не начата (иначе 409 с текстом). */
    cancel: (id: string) => http.request<Booking>(`/bookings/${id}/cancel`, { method: 'POST' }),

    /** GET /bookings/{id}/agreement: PDF. Запрос с Bearer-токеном, поэтому скачиваем через Blob, а не обычной ссылкой. */
    agreement: (id: string) => http.blob(`/bookings/${id}/agreement`),

    /** GET /ratings/pending (последние 100 завершённых поездок пользователя). */
    pendingRatings: (signal?: AbortSignal) => http.request<PendingRating[]>('/ratings/pending', { signal }),

    /** POST /ratings. 409: поездка не завершена, оценка уже оставлена, оценка по своей машине. */
    createRating: (body: CreateRatingBody) => http.request('/ratings', { method: 'POST', body }),

    /**
     * Прогноз для окна поездки. Берём только блок window. Точка: координаты машины, а если их нет,
     * бэк подставит точку по умолчанию. Недоступность погоды (503) для формы не критична.
     */
    weatherWindow: async (p: { latitude?: number | null; longitude?: number | null; from: string; to: string }, signal?: AbortSignal) => {
        const res = await http.request<{ window: WeatherWindow | null }>('/weather/forecast', {
            query: { latitude: p.latitude ?? undefined, longitude: p.longitude ?? undefined, from: p.from, to: p.to },
            signal,
        })
        return res.window
    },
}