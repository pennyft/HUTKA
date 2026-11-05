import { useEffect, useState } from 'react'

/** Значение с задержкой: поиск не шлёт запрос на каждую набранную букву. */
export function useDebounced<T>(value: T, ms = 400): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
