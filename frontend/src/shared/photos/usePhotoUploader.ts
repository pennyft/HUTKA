import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createLimiter, type PhotoFolder } from './logic'
import { uploadPhoto } from './upload'

export interface PhotoItem {
  id: string
  /** Локальный адрес превью (object URL), живёт, пока фото в списке. */
  preview: string
  status: 'uploading' | 'done' | 'error'
  /** Публичная ссылка после успешной загрузки. */
  url?: string
  error?: string
}

/** Не больше трёх одновременных загрузок на всё приложение. */
const limit = createLimiter(3)

let counter = 0

/**
 * Состояние выбора фото: файлы сразу сжимаются и грузятся в хранилище, пока пользователь заполняет форму.
 * urls это ссылки только успешно загруженных фото в порядке добавления. Файлы держим в памяти для повторной попытки.
 * initialUrls: фото, которые уже лежат в хранилище (правка машины): они сразу в списке и их можно удалить или дополнить.
 */
export function usePhotoUploader(folder: PhotoFolder, max: number, initialUrls: string[] = []) {
  // уже загруженные фото (например, при правке машины): сразу считаются готовыми, превью берётся по их ссылке
  const [items, setItems] = useState<PhotoItem[]>(() => initialUrls.map((url) => ({ id: `p${counter++}`, preview: url, status: 'done' as const, url })))
  const [notice, setNotice] = useState<string | null>(null)
  const files = useRef(new Map<string, File>())
  const previews = useRef(new Set<string>())

  useEffect(() => {
    const set = previews.current
    return () => set.forEach((p) => URL.revokeObjectURL(p))
  }, [])

  const patch = useCallback((id: string, change: Partial<PhotoItem>) => setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...change } : i))), [])

  const start = useCallback(
    (id: string) => {
      const file = files.current.get(id)
      if (!file) return
      patch(id, { status: 'uploading', error: undefined })
      limit(() => uploadPhoto(file, folder)).then(
        (url) => patch(id, { status: 'done', url }),
        (e: unknown) => patch(id, { status: 'error', error: e instanceof Error ? e.message : 'Не удалось загрузить фото.' }),
      )
    },
    [folder, patch],
  )

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const incoming = Array.from(list)
      const room = Math.max(0, max - items.length)
      const accepted = incoming.slice(0, room)
      setNotice(incoming.length > accepted.length ? `Можно добавить не больше ${max} фото.` : null)
      const created: PhotoItem[] = accepted.map((file) => {
        const id = `p${counter++}`
        const preview = URL.createObjectURL(file)
        previews.current.add(preview)
        files.current.set(id, file)
        return { id, preview, status: 'uploading' as const }
      })
      if (created.length === 0) return
      setItems((prev) => [...prev, ...created])
      created.forEach((i) => start(i.id))
    },
    [items.length, max, start],
  )

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) {
        URL.revokeObjectURL(item.preview)
        previews.current.delete(item.preview)
      }
      return prev.filter((i) => i.id !== id)
    })
    files.current.delete(id)
    setNotice(null)
  }, [])

  const urls = useMemo(() => items.flatMap((i) => (i.status === 'done' && i.url ? [i.url] : [])), [items])

  return {
    items,
    urls,
    notice,
    addFiles,
    remove,
    retry: start,
    busy: items.some((i) => i.status === 'uploading'),
    failed: items.some((i) => i.status === 'error'),
    full: items.length >= max,
  }
}

export type PhotoUploader = ReturnType<typeof usePhotoUploader>
