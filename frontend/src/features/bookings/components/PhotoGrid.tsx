import { CarPhoto } from '@/features/cars/components/CarPhoto'

/** Фото осмотра (до и после поездки). Ссылки внешние, открываются в новой вкладке. */
export function PhotoGrid({ title, urls }: { title: string; urls: string[] }) {
  if (urls.length === 0) return null
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-fg">{title}</h3>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {urls.map((url, i) => (
          <li key={`${url}-${i}`}>
            <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${title}: фото ${i + 1}, открыть в новой вкладке`} className="block overflow-hidden rounded-xl">
              <CarPhoto src={url} className="aspect-square w-full" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
