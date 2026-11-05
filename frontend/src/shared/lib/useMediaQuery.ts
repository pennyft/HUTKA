import { useSyncExternalStore } from 'react'

/** Подписка на CSS media query (например '(min-width: 1024px)'). На сервере и до монтирования возвращает false. */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', onChange)
      return () => m.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
