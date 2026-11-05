/** Базовый URL API. Пусто = same-origin через прокси Vite (/api). В production задайте VITE_API_URL. */
export const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || '/api'

/** URL WebSocket (STOMP). Бэк: endpoint /ws, без SockJS. */
export function wsUrl(): string {
  const base = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE}`
  return `${base.replace(/^http/, 'ws')}/ws`
}

/**
 * Растровые тайлы карты. По умолчанию tile.openstreetmap.org: подходит для разработки и небольшой нагрузки.
 * Правила использования серверов OSM запрещают интенсивное использование без разрешения и требуют указания
 * авторства; не зашивать адрес намертво тоже рекомендуется. Для production задайте свой провайдер тайлов
 * в VITE_MAP_TILES_URL (и текст авторства в VITE_MAP_ATTRIBUTION).
 */
export const MAP_TILES_URL: string = (import.meta.env.VITE_MAP_TILES_URL as string | undefined) || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const MAP_ATTRIBUTION: string =
  (import.meta.env.VITE_MAP_ATTRIBUTION as string | undefined) ||
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors'
