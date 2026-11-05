import { formatAgo } from '@/features/notifications/time'
import { AUTHOR_LABEL } from '../labels'
import type { ConversationItem } from '../logic'

/** Сообщение переписки. Своё справа, ответы поддержки и AI слева. Переносы строк сохраняются. */
export function MessageBubble({ item, now }: { item: ConversationItem; now: Date }) {
  const mine = item.authorType === 'user'
  return (
    <li className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${mine ? 'bg-accent text-accent-fg' : 'border border-line bg-surface text-fg'}`}>
        <p className={`text-xs font-semibold ${mine ? 'text-accent-fg' : 'text-muted'}`}>
          {AUTHOR_LABEL[item.authorType]} <span className="font-normal opacity-80">· {formatAgo(item.createdAt, now)}</span>
        </p>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm">{item.body}</p>
      </div>
    </li>
  )
}
