import { useState, type InputHTMLAttributes, type Ref } from 'react'
import { Check, Eye, EyeOff } from 'lucide-react'

const inputBase =
    'w-full rounded-xl border bg-surface px-3.5 py-3 text-sm text-fg placeholder:text-muted transition-colors focus:outline-none'
const inputOk = 'border-line focus:border-primary focus:ring-1 focus:ring-primary'
const inputBad = 'border-danger ring-1 ring-danger'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string
    error?: string
    hint?: string
    ref?: Ref<HTMLInputElement>
}

/** Поле ввода: подпись, подсказка, текст ошибки. Совместимо с register() из react-hook-form (ref как проп). */
export function TextField({ label, error, hint, id, ref, className = '', ...rest }: FieldProps) {
    const fieldId = id ?? rest.name
    return (
        <div>
            <label htmlFor={fieldId} className="mb-1.5 block text-xs font-medium text-fg">
                {label}
            </label>
            <input
                id={fieldId}
                ref={ref}
                aria-invalid={!!error}
                className={`${inputBase} ${error ? inputBad : inputOk} ${className}`}
                {...rest}
            />
            {error ? (
                <p className="mt-1 text-xs text-danger">{error}</p>
            ) : (
                hint && <p className="mt-1 text-xs text-muted">{hint}</p>
            )}
        </div>
    )
}

/** Поле пароля с кнопкой «показать/скрыть». */
export function PasswordField({ label, error, hint, id, ref, ...rest }: FieldProps) {
    const [shown, setShown] = useState(false)
    const fieldId = id ?? rest.name
    return (
        <div>
            <label htmlFor={fieldId} className="mb-1.5 block text-xs font-medium text-fg">
                {label}
            </label>
            <div className="relative">
                <input
                    id={fieldId}
                    ref={ref}
                    type={shown ? 'text' : 'password'}
                    aria-invalid={!!error}
                    className={`${inputBase} pr-10 ${error ? inputBad : inputOk}`}
                    {...rest}
                />
                <button
                    type="button"
                    onClick={() => setShown((v) => !v)}
                    aria-label={shown ? 'Скрыть пароль' : 'Показать пароль'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-muted transition-colors hover:text-fg"
                >
                    {shown ? <EyeOff className="size-[18px]" aria-hidden /> : <Eye className="size-[18px]" aria-hidden />}
                </button>
            </div>
            {error ? (
                <p className="mt-1 text-xs text-danger">{error}</p>
            ) : (
                hint && <p className="mt-1 text-xs text-muted">{hint}</p>
            )}
        </div>
    )
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
    error?: string
    ref?: Ref<HTMLInputElement>
    children: React.ReactNode
}

/**
 * Чекбокс: настоящий input (клавиатура и скринридер работают), поверх него рисуем квадрат и иконку Check.
 * Галочку рисует lucide-иконка, а не фон из data-URL: класс с вложенным SVG в Tailwind не генерировался, и отмеченный квадрат оставался пустым.
 */
export function Checkbox({ error, children, ref, ...rest }: CheckboxProps) {
    return (
        <div>
            <label className="relative flex cursor-pointer select-none items-start gap-2.5">
                <input type="checkbox" ref={ref} aria-invalid={!!error} className="peer sr-only" {...rest} />
                <span
                    aria-hidden
                    className={`mt-0.5 size-[18px] shrink-0 rounded border-[1.5px] bg-surface transition-colors peer-checked:border-primary peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2 peer-disabled:opacity-60 ${
                        error ? 'border-danger' : 'border-line'
                    }`}
                />
                <Check aria-hidden strokeWidth={3} className="pointer-events-none absolute left-0 top-0.5 hidden size-[18px] p-[2px] text-primary-fg peer-checked:block" />
                <span className="text-xs leading-relaxed text-muted">{children}</span>
            </label>
            {error && <p className="mt-1 text-xs text-danger">{error}</p>}
        </div>
    )
}