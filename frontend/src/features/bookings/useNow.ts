import { useEffect, useState } from 'react'

/** Текущее время, обновляемое раз в intervalMs (по умолчанию раз в 30 секунд): живая проверка «начало не в прошлом». */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
