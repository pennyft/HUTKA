import { Camera, LoaderCircle, RotateCw, X } from 'lucide-react'
import type { PhotoUploader } from './usePhotoUploader'

interface Props {
  uploader: PhotoUploader
  label: string
  min: number
  max: number
  /** На телефоне открывать сразу камеру (для фото машины перед поездкой). */
  capture?: boolean
  error?: string
  hint?: string
}

/** Выбор и загрузка фото: превью с состоянием каждой загрузки, повтор при ошибке, удаление. Файлы грузятся сразу после выбора. */
export function PhotoPicker({ uploader, label, min, max, capture, error, hint }: Props) {
  const { items, urls, notice, addFiles, remove, retry, full } = uploader
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="text-xs font-medium text-fg">{label}</p>
        <p className="text-xs text-muted">
          {urls.length} из {max} · минимум {min}
        </p>
      </div>

      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((i) => (
          <li key={i.id} className="relative aspect-square overflow-hidden rounded-2xl border border-line bg-surface-2">
            <img src={i.preview} alt="" className={`size-full object-cover ${i.status === 'done' ? '' : 'opacity-50'}`} />
            {i.status === 'uploading' && (
              <span className="absolute inset-0 flex items-center justify-center" role="status" aria-label="Загружаем фото">
                <LoaderCircle className="size-6 animate-spin text-fg" aria-hidden />
              </span>
            )}
            {i.status === 'error' && (
              <button type="button" onClick={() => retry(i.id)} title={i.error} className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1 text-center text-xs font-semibold text-danger">
                <RotateCw className="size-5" aria-hidden />
                Ошибка. Повторить
              </button>
            )}
            <button type="button" onClick={() => remove(i.id)} aria-label="Удалить фото" className="absolute right-1 top-1 rounded-full bg-surface p-1 text-fg shadow transition-colors hover:bg-surface-2">
              <X className="size-4" aria-hidden />
            </button>
          </li>
        ))}
        {!full && (
          <li>
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-line bg-surface text-xs text-muted transition-colors hover:bg-surface-2 focus-within:ring-2 focus-within:ring-primary">
              <Camera className="size-6" aria-hidden />
              Добавить
              <input
                type="file"
                accept="image/*"
                multiple
                capture={capture ? 'environment' : undefined}
                className="sr-only"
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </li>
        )}
      </ul>

      {items.find((i) => i.status === 'error')?.error && <p className="mt-1 text-xs text-danger">{items.find((i) => i.status === 'error')?.error}</p>}
      {notice && <p className="mt-1 text-xs text-muted">{notice}</p>}
      {error ? <p className="mt-1 text-xs text-danger">{error}</p> : hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  )
}
