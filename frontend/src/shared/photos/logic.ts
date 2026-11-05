/** Чистая логика загрузки фото: размеры, проверка файла, тексты ошибок, ограничитель параллельности. Без браузерных API, поэтому тестируется. */
export const PHOTO_MAX_SIDE = 1600
export const PHOTO_QUALITY = 0.82
export const PHOTO_MAX_INPUT_MB = 20
/** Бэк принимает ссылку до 1024 символов (StartTripRequest, FinishTripRequest). */
export const MAX_URL_LENGTH = 1024

export type PhotoFolder = 'bookings' | 'cars'

/** Размер после сжатия: длинная сторона не больше max, пропорции сохраняются, увеличивать не нужно. */
export function fitSize(width: number, height: number, max: number): { width: number; height: number } {
  if (!(width > 0) || !(height > 0)) return { width: 0, height: 0 }
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** Проверка выбранного файла до загрузки. null значит «подходит». */
export function validateInputFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith('image/')) return 'Выберите изображение (JPEG или PNG).'
  if (file.size > PHOTO_MAX_INPUT_MB * 1024 * 1024) return `Файл больше ${PHOTO_MAX_INPUT_MB} МБ.`
  return null
}

/** Текст по статусу ответа хранилища на PUT (Cloudflare R2). */
export function uploadFailureMessage(status: number): string {
  if (status === 403) return 'Хранилище отклонило загрузку: ссылка недействительна или истекла. Повторите.'
  if (status === 400) return 'Хранилище не приняло файл. Повторите.'
  if (status === 404) return 'Бакет для фото не найден: проверьте настройки сервера.'
  if (status === 413) return 'Файл слишком большой для хранилища.'
  return `Не удалось загрузить фото (код ${status}). Повторите.`
}

/** Запрос не дошёл до хранилища: нет сети либо браузер заблокировал его из-за CORS (по ответу fetch их не отличить). */
export const STORAGE_UNREACHABLE = 'Не удалось отправить фото в хранилище. Проверьте интернет; если сеть в порядке, проверьте CORS-правило бакета.'

/** Ограничитель параллельных задач: фото сжимаются и грузятся не больше n за раз, чтобы не нагружать телефон. */
export function createLimiter(n: number) {
  let active = 0
  const queue: (() => void)[] = []
  const next = () => {
    active--
    queue.shift()?.()
  }
  return <T>(task: () => Promise<T>): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const run = () => {
        active++
        task().then(resolve, reject).finally(next)
      }
      if (active < n) run()
      else queue.push(run)
    })
}
