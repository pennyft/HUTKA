import { fitSize, PHOTO_MAX_SIDE, PHOTO_QUALITY } from './logic'

/**
 * Сжатие перед загрузкой: длинная сторона до 1600 px, JPEG качеством 0,82. Фото с телефона (5–10 МБ) превращается в 200–500 КБ,
 * так укладываемся в бесплатный объём хранилища и быстрее грузим по мобильной сети. Поворот по EXIF применяется при чтении.
 * Прозрачные PNG заливаются белым, иначе JPEG сделает фон чёрным.
 */
export async function compressImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('Не удалось прочитать изображение. Выберите фото в формате JPEG или PNG.')
  }
  const { width, height } = fitSize(bitmap.width, bitmap.height, PHOTO_MAX_SIDE)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Не удалось подготовить фото.')
  }
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', PHOTO_QUALITY))
  if (!blob) throw new Error('Не удалось подготовить фото.')
  return blob
}
