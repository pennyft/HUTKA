import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { TriangleAlert } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { formatDateTime } from '@/shared/lib/format'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { ADMIN_PAGE_SIZE } from '../api'
import { Pager } from '../components/Pager'
import { Pill } from '../components/Pills'
import { QuestionEditor } from '../components/QuestionEditor'
import { useActiveCount, usePddActions, usePddList } from '../pdd/hooks'
import { activeWarning, buildCreateBody, buildUpdateBody, emptyForm, formFromQuestion } from '../pdd/logic'
import type { PddQuestion } from '../pdd/types'

type Filter = '' | 'active' | 'inactive'

/**
 * AD18. Вопросы теста ПДД: таблица с фильтром по активности, добавление, правка, включение и выключение, удаление.
 * GET/POST /admin/pdd/questions, PATCH/DELETE /admin/pdd/questions/{id}. Если активных вопросов меньше 10, у пользователей тест недоступен
 * (на экране об этом предупреждение). Статистики прохождений в API нет.
 */
export default function AdminPddQuestionsPage() {
  const [sp, setSp] = useSearchParams()
  const f: Filter = sp.get('active') === 'true' ? 'active' : sp.get('active') === 'false' ? 'inactive' : ''
  const pageParam = Number(sp.get('page'))
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam - 1 : 0
  const list = usePddList(f === '' ? undefined : f === 'active', page)
  const activeCount = useActiveCount()
  const { create, update, remove } = usePddActions()
  const [editing, setEditing] = useState<PddQuestion | 'new' | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const items = list.data?.items ?? []
  const warning = activeWarning(activeCount.data)
  const go = (filter: Filter, p = 0) => setSp({ ...(filter ? { active: filter === 'active' ? 'true' : 'false' } : {}), ...(p > 0 ? { page: String(p + 1) } : {}) }, { replace: true })

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-10 pt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">Вопросы теста ПДД</h1>
          {activeCount.data !== undefined && <p className="mt-1 text-sm text-muted">Активных вопросов: {activeCount.data}</p>}
        </div>
        <Button variant="dark" onClick={() => setEditing('new')} className="sm:w-auto">
          Добавить вопрос
        </Button>
      </div>

      {warning && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl border border-danger/50 bg-surface p-3 text-sm text-fg">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden />
          {warning}
        </p>
      )}

      {editing === 'new' && (
        <QuestionEditor
          title="Новый вопрос"
          submitLabel="Добавить"
          initial={emptyForm()}
          loading={create.isPending}
          error={create.isError ? create.error : undefined}
          onCancel={() => setEditing(null)}
          onSubmit={(form) => create.mutate(buildCreateBody(form), { onSuccess: () => setEditing(null) })}
        />
      )}
      {editing && editing !== 'new' && (
        <QuestionEditor
          key={editing.id}
          title="Редактирование вопроса"
          submitLabel="Сохранить"
          initial={formFromQuestion(editing)}
          loading={update.isPending}
          error={update.isError ? update.error : undefined}
          onCancel={() => setEditing(null)}
          onSubmit={(form) => {
            const body = buildUpdateBody(editing, form)
            if (Object.keys(body).length === 0) return setEditing(null)
            update.mutate({ id: editing.id, body }, { onSuccess: () => setEditing(null) })
          }}
        />
      )}

      <div role="group" aria-label="Фильтр вопросов" className="flex gap-2">
        {(
          [
            ['', 'Все'],
            ['active', 'Активные'],
            ['inactive', 'Выключенные'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={f === value}
            onClick={() => go(value)}
            className={`h-9 rounded-full border px-3.5 text-sm transition-colors ${f === value ? 'border-primary bg-accent font-medium text-accent-fg' : 'border-line bg-surface text-fg hover:bg-surface-2'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {list.isPending ? (
        <div className="space-y-2" aria-hidden>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : list.isError ? (
        <div className="rounded-3xl border border-line bg-surface p-8">
          <h2 className="text-lg font-bold text-fg">Не удалось загрузить вопросы</h2>
          <p className="mt-1 text-sm text-muted">{errorMessage(list.error)}</p>
          <div className="mt-5">
            <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
              Повторить
            </Button>
          </div>
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-3xl border border-line bg-surface p-8 text-sm text-muted">Вопросов нет.</p>
      ) : (
        <div>
          <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
            {items.map((q) => (
              <li key={q.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 break-words font-medium text-fg">{q.text}</p>
                  <span className="flex flex-wrap gap-1.5">
                    <Pill warn={!q.active}>{q.active ? 'Активен' : 'Выключен'}</Pill>
                    {q.category && <Pill>{q.category}</Pill>}
                  </span>
                </div>
                <ol className="mt-2 space-y-0.5 text-sm text-muted">
                  {q.variants.map((v, i) => (
                    <li key={i} className={i === q.correctIndex ? 'font-semibold text-fg' : ''}>
                      {i + 1}. {v}
                      {i === q.correctIndex && ' ✓'}
                    </li>
                  ))}
                </ol>
                <p className="mt-2 text-xs text-muted">
                  {q.source ? `источник: ${q.source} · ` : ''}добавлен {formatDateTime(q.createdAt)}
                </p>
                {deleting === q.id ? (
                  <div className="mt-3 rounded-2xl border border-line bg-surface-2 p-3">
                    <p className="text-sm text-fg">Удалить вопрос? Это нельзя отменить.</p>
                    <div className="mt-2 grid grid-cols-2 gap-3 sm:max-w-sm">
                      <Button variant="dark" loading={remove.isPending} onClick={() => remove.mutate(q.id, { onSettled: () => setDeleting(null) })}>
                        Удалить
                      </Button>
                      <Button variant="outline" disabled={remove.isPending} onClick={() => setDeleting(null)}>
                        Отмена
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setEditing(q)} className="sm:w-auto">
                      Редактировать
                    </Button>
                    <Button variant="outline" loading={update.isPending && update.variables?.id === q.id} onClick={() => update.mutate({ id: q.id, body: { active: !q.active } })} className="sm:w-auto">
                      {q.active ? 'Выключить' : 'Включить'}
                    </Button>
                    <Button variant="outline" onClick={() => setDeleting(q.id)} className="sm:w-auto">
                      Удалить
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
          <Pager page={page} size={ADMIN_PAGE_SIZE} total={list.data?.total ?? 0} onPage={(p) => go(f, p)} />
        </div>
      )}
    </div>
  )
}
