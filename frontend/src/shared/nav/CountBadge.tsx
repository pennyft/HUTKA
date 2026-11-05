interface Props {
  count?: number
  urgent?: boolean
  /** Для скринридера: «3 новых», «3 в очереди» */
  label?: string
  className?: string
}

/** Счётчик на пункте меню. При 0 и undefined ничего не рисует. */
export function CountBadge({ count, urgent, label = 'новых', className = '' }: Props) {
  if (!count || count <= 0) return null
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium ${
        urgent ? 'bg-danger text-primary-fg' : 'bg-primary text-primary-fg'
      } ${className}`}
    >
      {count > 99 ? '99+' : count}
      <span className="sr-only"> {label}</span>
    </span>
  )
}
