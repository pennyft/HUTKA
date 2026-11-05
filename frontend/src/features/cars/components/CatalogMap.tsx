import { useEffect } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { MAP_ATTRIBUTION, MAP_TILES_URL } from '@/shared/config/env'
import type { Car, CarMapMarker } from '@/shared/types/car'
import { formatPrice } from '../format'
import { priceIcon, type PillState } from './mapIcons'
import { MapMiniCard } from './MapMiniCard'

/** Центр Минска (из конфигурации бэка: weather.default-latitude/longitude). Используется, пока маркеров нет. */
const MINSK: [number, number] = [53.9006, 27.559]

/** Подгоняет карту под набор маркеров. Срабатывает при смене набора (фильтры), а не при наведении и выборе. */
function FitBounds({ markers }: { markers: CarMapMarker[] }) {
  const map = useMap()
  useEffect(() => {
    if (!markers.length) return
    const bounds = L.latLngBounds(markers.map((m) => [Number(m.latitude), Number(m.longitude)] as [number, number]))
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 })
  }, [map, markers])
  return null
}

function ClearOnMapClick({ onClear }: { onClear: () => void }) {
  useMapEvents({ click: onClear })
  return null
}

interface Props {
  markers: CarMapMarker[]
  loading: boolean
  hoverId: string | null
  selectedId: string | null
  /** Данные выбранной машины для мини-карточки; undefined, пока грузятся */
  selectedCar?: Car
  onSelect: (id: string | null) => void
}

export default function CatalogMap({ markers, loading, hoverId, selectedId, selectedCar, onSelect }: Props) {
  return (
    // isolate: слои Leaflet имеют z-index до 1000 и без своего контекста перекрывали бы шапку и меню
    <div className="relative isolate size-full overflow-hidden rounded-2xl border border-line">
      <MapContainer center={MINSK} zoom={11} scrollWheelZoom className="size-full">
        <TileLayer url={MAP_TILES_URL} attribution={MAP_ATTRIBUTION} />
        <FitBounds markers={markers} />
        <ClearOnMapClick onClear={() => onSelect(null)} />
        {markers.map((m) => {
          const active = m.id === selectedId || m.id === hoverId
          const state: PillState = active ? 'active' : m.status === 'available' ? 'normal' : 'busy'
          return (
            <Marker
              key={m.id}
              position={[Number(m.latitude), Number(m.longitude)]}
              icon={priceIcon(Number(m.pricePerHour), state)}
              zIndexOffset={active ? 1000 : 0}
              title={`${formatPrice(Number(m.pricePerHour))} BYN в час`}
              eventHandlers={{ click: () => onSelect(m.id) }}
            />
          )
        })}
      </MapContainer>

      {loading && <div className="absolute left-3 top-3 z-[500] rounded-full bg-surface px-3 py-1 text-xs text-muted">Обновляем…</div>}
      {!loading && markers.length === 0 && (
        <div className="absolute inset-x-3 top-3 z-[500] rounded-xl bg-surface px-3 py-2 text-center text-sm text-muted">Нет машин с известным местоположением</div>
      )}
      {selectedId && <MapMiniCard car={selectedCar} onClose={() => onSelect(null)} />}
    </div>
  )
}
