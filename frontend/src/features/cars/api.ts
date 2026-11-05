import { http } from '@/api/http'
import type { Car, CarMapMarker } from '@/shared/types/car'

export const PAGE_SIZE = 20

/** Элемент GET /ratings (RatingItemResponse). authorFirstName бэк отдаёт только имя. */
export interface CarReview {
  id: string
  score: number
  comment: string | null
  createdAt: string
  authorFirstName: string | null
}

/** RatingListResponse: средняя оценка, общее число оценок и страница отзывов (новые первыми). */
export interface CarReviewList {
  averageRating: number | null
  ratingsCount: number
  ratings: CarReview[]
}

export const REVIEWS_PAGE_SIZE = 20

type Query = Record<string, string | number | undefined>

export const carsApi = {
  /** GET /cars. Тело — массив, общее число по фильтру — в заголовке X-Total-Count (бэк открывает его для CORS). */
  list: (query: Query, signal?: AbortSignal) => http.requestWithTotal<Car[]>('/cars', { query, signal }),

  /** GET /cars/map: только машины с координатами, без страниц. */
  map: (query: Query, signal?: AbortSignal) => http.request<CarMapMarker[]>('/cars/map', { query, signal }),

  /** GET /cars/{id}: 404 для скрытых и не прошедших модерацию машин. */
  details: (id: string, signal?: AbortSignal) => http.request<Car>(`/cars/${id}`, { signal }),

  /** GET /ratings?carId=: на бэке требует токен (в SecurityConfig публичны только /cars и /cars/**). */
  reviews: (carId: string, signal?: AbortSignal) => http.request<CarReviewList>('/ratings', { query: { carId, size: REVIEWS_PAGE_SIZE }, signal }),
}
