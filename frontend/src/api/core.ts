import { API_BASE } from '@/shared/config/env'
import { toApiError } from './errors'

type Query = Record<string, string | number | boolean | undefined | null>

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Query
  body?: unknown
  signal?: AbortSignal
}

export interface ClientConfig {
  /** Заголовки, которые нужно добавить к запросу (Bearer-токен или X-CSRF-TOKEN). */
  headers: (method: string) => Record<string, string>
  /** Для админки: cookie-сессия. */
  credentials?: RequestCredentials
  /** Вызывается при 401 (кроме запросов, помеченных skipUnauthorized). */
  onUnauthorized: () => void
}

function buildUrl(path: string, query?: Query): string {
  const url = `${API_BASE}${path}`
  if (!query) return url
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') params.set(k, String(v))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

export function createClient(config: ClientConfig) {
  async function raw(path: string, opts: RequestOptions = {}, skipUnauthorized = false): Promise<Response> {
    const method = opts.method ?? 'GET'
    const headers: Record<string, string> = { ...config.headers(method) }
    let body: BodyInit | undefined
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(opts.body)
    }
    const res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      body,
      credentials: config.credentials,
      signal: opts.signal,
    })
    if (res.status === 401 && !skipUnauthorized) config.onUnauthorized()
    if (!res.ok) throw await toApiError(res)
    return res
  }

  /** JSON-запрос. Для ответов без тела (200/204 пустые) возвращает undefined. */
  async function request<T = void>(path: string, opts?: RequestOptions, skipUnauthorized = false): Promise<T> {
    const res = await raw(path, opts, skipUnauthorized)
    const text = await res.text()
    return (text ? JSON.parse(text) : undefined) as T
  }

  /** Список + общее число из заголовка X-Total-Count (каталог машин). */
  async function requestWithTotal<T>(path: string, opts?: RequestOptions) {
    const res = await raw(path, opts)
    const total = Number(res.headers.get('X-Total-Count') ?? 0)
    return { data: (await res.json()) as T, total }
  }

  /** Файл (PDF договора, CSV). Запрос идёт с авторизацией, поэтому обычной ссылкой не скачать. */
  async function blob(path: string, opts?: RequestOptions): Promise<Blob> {
    return (await raw(path, opts)).blob()
  }

  return { request, requestWithTotal, blob }
}
