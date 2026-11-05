import { ApiError, errorMessage } from '@/api/errors'
import { compressImage } from './compress'
import { MAX_URL_LENGTH, STORAGE_UNREACHABLE, uploadFailureMessage, validateInputFile, type PhotoFolder } from './logic'
import { requestPresign, type PresignResponse } from './presign'

/**
 * Загрузка одного фото в Cloudflare R2: проверка, сжатие, подписанная ссылка от бэка (POST /uploads/presign), PUT файла
 * прямо в хранилище, публичная ссылка в ответ. Ссылку потом отправляют в API. Любая ошибка это Error с текстом для пользователя.
 */
export async function uploadPhoto(file: File, folder: PhotoFolder, signal?: AbortSignal): Promise<string> {
  const problem = validateInputFile(file)
  if (problem) throw new Error(problem)

  const blob = await compressImage(file)

  let presign: PresignResponse
  try {
    presign = await requestPresign(folder, blob.size)
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) throw new Error('Сервер пока не поддерживает загрузку фото.')
    throw new Error(errorMessage(e))
  }

  let res: Response
  try {
    res = await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': presign.contentType }, body: blob, signal })
  } catch {
    throw new Error(STORAGE_UNREACHABLE)
  }
  if (!res.ok) throw new Error(uploadFailureMessage(res.status))

  if (presign.publicUrl.length > MAX_URL_LENGTH) throw new Error('Ссылка на фото получилась слишком длинной.')
  return presign.publicUrl
}
