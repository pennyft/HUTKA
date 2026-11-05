import { Link } from 'react-router'
import { Star, TriangleAlert } from 'lucide-react'
import { CarPhoto } from '@/features/cars/components/CarPhoto'
import { formatPrice, formatRating } from '@/features/cars/format'
import { useSendTicketDraft } from '../hooks'
import { ticketPath } from '../logic'
import type { AiCabinet, AiCar, ChatEntry } from '../types'

interface Props {
  entry: ChatEntry
  cabinet: AiCabinet
  onRetry: (entry: ChatEntry) => void
  /** Переход по ссылке из сообщения: на телефоне панель после него закрывается */
  onNavigate: () => void
}

const linkClass = 'font-medium text-fg underline hover:opacity-80'

/** Реплика чата: пузырь с текстом, а у ответов помощника ещё машины, созданное или предложенное обращение и предупреждение. */
export function AiMessage({ entry, cabinet, onRetry, onNavigate }: Props) {
  if (entry.role === 'user') {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-fg">{entry.text}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2 text-sm text-fg">
        <p className="whitespace-pre-wrap break-words">{entry.text}</p>
        {entry.failed && (
          <button type="button" onClick={() => onRetry(entry)} className={`mt-1 ${linkClass}`}>
            Повторить
          </button>
        )}
      </div>

      {entry.emergency && (
        <div role="alert" className="max-w-[92%] rounded-2xl border border-danger/50 bg-surface px-3.5 py-2.5 text-sm text-fg">
          <p className="flex items-center gap-2 font-semibold">
            <TriangleAlert className="size-4 shrink-0 text-danger" aria-hidden />
            Если есть угроза жизни или здоровью
          </p>
          <p className="mt-1 text-muted">
            Сразу звоните <a href="tel:112" className={linkClass}>112</a>, это единый номер экстренных служб.
          </p>
        </div>
      )}

      {entry.cars && entry.cars.length > 0 && (
        <ul className="-mr-3 flex w-full snap-x gap-2 overflow-x-auto pb-1 pr-3 [scrollbar-width:none]">
          {entry.cars.map((car) => (
            <li key={car.id} className="snap-start">
              <CarSuggestion car={car} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      )}

      {entry.createdTicket && (
        <div className="max-w-[92%] rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg">
          <p className="font-semibold">Обращение создано{entry.createdTicket.priority === 'urgent' ? ' (срочное)' : ''}</p>
          <Link to={ticketPath(cabinet, entry.createdTicket.id)} onClick={onNavigate} className={linkClass}>
            Открыть обращение
          </Link>
        </div>
      )}

      {entry.ticketDraft && <TicketDraftCard entry={entry} cabinet={cabinet} onNavigate={onNavigate} />}
    </div>
  )
}

function CarSuggestion({ car, onNavigate }: { car: AiCar; onNavigate: () => void }) {
  return (
    <Link to={`/cars/${car.id}`} onClick={onNavigate} className="block w-40 overflow-hidden rounded-2xl border border-line bg-surface transition-colors hover:bg-surface-2">
      <CarPhoto src={car.photoUrl ?? undefined} className="aspect-[16/10] w-full" />
      <div className="px-2.5 py-2">
        <p className="truncate text-sm font-semibold text-fg">
          {car.make} {car.model}
        </p>
        <p className="flex items-center gap-1.5 text-xs text-muted">
          {car.pricePerHour !== null && <span>{formatPrice(car.pricePerHour)} BYN/ч</span>}
          {car.ratingAvg !== null && car.ratingAvg > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Star className="size-3 fill-current" aria-hidden />
              {formatRating(car.ratingAvg)}
            </span>
          )}
        </p>
      </div>
    </Link>
  )
}

/** Предложение обращения (при сбое помощника или по его совету): кнопка превращает черновик в настоящее обращение. */
function TicketDraftCard({ entry, cabinet, onNavigate }: { entry: ChatEntry; cabinet: AiCabinet; onNavigate: () => void }) {
  const send = useSendTicketDraft(entry.id, cabinet)
  const draft = entry.ticketDraft
  if (!draft) return null

  return (
    <div className="max-w-[92%] rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-sm text-fg">
      <p className="font-semibold">
        Обращение в поддержку{draft.priority === 'urgent' && <span className="ml-2 rounded-full border border-danger/60 px-2 py-0.5 text-[11px] font-medium text-danger">срочное</span>}
      </p>
      <p className="mt-1 font-medium">{draft.subject}</p>
      <p className="mt-0.5 line-clamp-3 text-muted">{draft.description}</p>
      {entry.ticketSentId ? (
        <p className="mt-2">
          Отправлено.{' '}
          <Link to={ticketPath(cabinet, entry.ticketSentId)} onClick={onNavigate} className={linkClass}>
            Открыть обращение
          </Link>
        </p>
      ) : (
        <button
          type="button"
          disabled={send.isPending}
          onClick={() => send.mutate(draft)}
          className="mt-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {send.isPending ? 'Отправляем…' : 'Отправить обращение'}
        </button>
      )}
    </div>
  )
}
