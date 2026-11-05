import type { ButtonHTMLAttributes } from 'react'

type Variant = 'accent' | 'dark' | 'outline'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  /** accent: главное действие (сейчас графит), dark: то же в тёмном цвете, outline: нейтральное. */
  variant?: Variant
}

const variants: Record<Variant, string> = {
  accent: 'bg-accent text-accent-fg hover:bg-accent-hover',
  dark: 'bg-primary text-primary-fg hover:bg-primary-hover',
  outline: 'border border-line bg-surface text-fg hover:bg-surface-2',
}

/** Кнопка на всю ширину контейнера. Во время loading блокируется и показывает спиннер. */
export function Button({ loading, disabled, variant = 'accent', children, className = '', ...rest }: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-semibold transition-colors active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {children}
      {loading && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
    </button>
  )
}
