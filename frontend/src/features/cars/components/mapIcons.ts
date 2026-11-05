import L from 'leaflet'
import { formatPrice } from '../format'

export type PillState = 'normal' | 'active' | 'busy'

const iconCache = new Map<string, L.DivIcon>()

/**
 * Ценник вместо маркера (каталог и мини-карта на странице машины). Иконки кэшируем по (цена, состояние),
 * чтобы не создавать их заново на каждый рендер. В html попадает только отформатированное число.
 */
export function priceIcon(price: number, state: PillState): L.DivIcon {
  const text = formatPrice(price)
  const key = `${text}|${state}`
  let icon = iconCache.get(key)
  if (!icon) {
    icon = L.divIcon({
      className: 'price-pill-icon',
      html: `<div class="price-pill${state === 'normal' ? '' : ` price-pill--${state}`}">${text}</div>`,
      iconSize: [0, 0],
    })
    iconCache.set(key, icon)
  }
  return icon
}
