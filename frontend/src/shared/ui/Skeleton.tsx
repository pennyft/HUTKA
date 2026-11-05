/** Заглушка на время загрузки: серый блок с пульсацией. Размер задаёт className. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-xl bg-surface-2 ${className}`} />
}
