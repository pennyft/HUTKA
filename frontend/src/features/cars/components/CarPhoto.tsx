import { useState } from 'react'
import { Car } from 'lucide-react'

/** Фото машины. Нет ссылки или картинка не загрузилась: нейтральная заглушка того же размера. */
export function CarPhoto({ src, className = '' }: { src?: string; className?: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)
  if (!src || failedSrc === src) {
    return (
      <div className={`flex items-center justify-center bg-surface-2 text-muted ${className}`}>
        <Car className="size-8" aria-hidden />
      </div>
    )
  }
  // alt пустой: название машины рядом в тексте, фото только украшает
  return <img src={src} alt="" loading="lazy" onError={() => setFailedSrc(src)} className={`object-cover ${className}`} />
}
