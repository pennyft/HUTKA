import { http } from '@/api/http'
import type { PhotoFolder } from './logic'

/** Ответ POST /uploads/presign (uploads/PresignResponse.java). */
export interface PresignResponse {
  /** Куда делать PUT с файлом. Ссылка подписана, действует несколько минут, это как токен: не светить в логах. */
  uploadUrl: string
  /** Адрес, который потом отправляется в API (photosBefore, photosAfter, photos машины). */
  publicUrl: string
  /** Content-Type, который нужно отправить в PUT: он входит в подпись, при несовпадении R2 ответит 403. */
  contentType: string
  expiresInSeconds: number
}

/**
 * POST /uploads/presign {folder, size}. 400: фото больше лимита сервера. 503: хранилище не настроено на сервере.
 * 401: нужен вход. Секретные ключи R2 есть только у бэка, фронт получает лишь временную ссылку.
 */
export const requestPresign = (folder: PhotoFolder, size: number) => http.request<PresignResponse>('/uploads/presign', { method: 'POST', body: { folder, size } })
