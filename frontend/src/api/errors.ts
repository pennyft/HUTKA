/** Формат ошибок бэка: { timestamp, status, message, fields? }. message на русском, его можно показывать как есть. */
export interface ApiErrorBody {
  timestamp?: string
  status?: number
  message?: string
  fields?: Record<string, string>
}

export class ApiError extends Error {
  status: number
  fields?: Record<string, string>

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

export async function toApiError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody | undefined
  try {
    body = (await res.json()) as ApiErrorBody
  } catch {
    // тело не JSON или пустое
  }
  return new ApiError(res.status, body?.message || `Ошибка ${res.status}`, body?.fields)
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Что-то пошло не так'
}
