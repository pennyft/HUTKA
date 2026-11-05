import { CircleAlert, CircleCheck, X } from 'lucide-react'
import { useToastStore } from './toast'

export function ToastHost() {
  const { message, kind, hide } = useToastStore()
  const visible = message !== null
  return (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed left-1/2 top-6 z-50 w-full max-w-md -translate-x-1/2 px-4 transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-24 opacity-0'
      }`}
    >
      <div
        className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-surface p-4 text-fg shadow-card ${
          kind === 'error' ? 'border-danger' : 'border-line'
        }`}
      >
        {kind === 'error' ? (
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
        ) : (
          <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden />
        )}
        <p className="text-xs font-medium leading-relaxed">{message}</p>
        <button type="button" onClick={hide} aria-label="Закрыть" className="ml-auto shrink-0 p-0.5 text-muted hover:text-fg">
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
