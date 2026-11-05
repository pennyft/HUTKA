import type { ReactNode, Ref, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const base = 'w-full rounded-xl border bg-surface px-3.5 py-3 text-sm text-fg placeholder:text-muted transition-colors focus:outline-none'
const ok = 'border-line focus:border-primary focus:ring-1 focus:ring-primary'
const bad = 'border-danger ring-1 ring-danger'

interface Common {
  label: string
  error?: string
  hint?: string
}

function Wrap({ label, error, hint, id, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}

/** Многострочное поле в стиле TextField. Совместимо с register() из react-hook-form (ref как проп). */
export function TextAreaField({ label, error, hint, id, ref, className = '', ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> }) {
  const fieldId = id ?? rest.name ?? label
  return (
    <Wrap label={label} error={error} hint={hint} id={fieldId}>
      <textarea id={fieldId} ref={ref} aria-invalid={!!error} className={`${base} resize-y ${error ? bad : ok} ${className}`} {...rest} />
    </Wrap>
  )
}

/** Выпадающий список в стиле TextField. */
export function SelectField({ label, error, hint, id, ref, className = '', children, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement> & { ref?: Ref<HTMLSelectElement> }) {
  const fieldId = id ?? rest.name ?? label
  return (
    <Wrap label={label} error={error} hint={hint} id={fieldId}>
      <select id={fieldId} ref={ref} aria-invalid={!!error} className={`${base} ${error ? bad : ok} ${className}`} {...rest}>
        {children}
      </select>
    </Wrap>
  )
}
