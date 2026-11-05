interface Props {
  /** Номер экрана из документа (A1, B7, P3, AD6...) */
  id: string
  title: string
  /** Какие эндпоинты использует экран — живая памятка прямо в интерфейсе */
  api: string[]
  note?: string
}

/** Заглушка экрана. Замените содержимое страницы, удалив этот компонент. */
export function Placeholder({ id, title, api, note }: Props) {
  return (
    <section className="mx-auto max-w-3xl p-6">
      <p className="text-sm text-muted">Экран {id}</p>
      <h1 className="mb-4 text-2xl font-semibold">{title}</h1>
      <ul className="mb-3 list-disc pl-5 font-mono text-sm text-fg">
        {api.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      {note && <p className="text-sm text-muted">{note}</p>}
    </section>
  )
}
