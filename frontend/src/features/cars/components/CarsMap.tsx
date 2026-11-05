import { useEffect, useMemo } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { CarMarker } from '../types'
import { formatPrice } from '../format'

/** Центр Минска. Те же координаты бэк использует для погодного виджета (app.weather.default-latitude/longitude). */
const DEFAULT_CENTER: [number, number] = [53.9006, 27.559]

interface Props {
    markers: CarMarker[]
    highlightedId: string | null
}

/** Ценник вместо маркера: свободная машина белая, занятая серая, подсвеченная (наведение на карточку) в акценте. */
function priceIcon(m: CarMarker, highlighted: boolean): L.DivIcon {
    const free = m.status === 'available'
    const cls = highlighted
        ? 'border-fg bg-accent text-fg scale-110'
        : free
            ? 'border-line bg-surface text-fg'
            : 'border-line bg-surface-2 text-muted'
    return L.divIcon({
        className: '',
        iconSize: [0, 0],
        html: `<span class="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm transition-transform ${cls}">${formatPrice(Number(m.pricePerHour))}</span>`,
    })
}

function FitBounds({ markers }: { markers: CarMarker[] }) {
    const map = useMap()
    useEffect(() => {
        if (markers.length === 0) return
        const bounds = L.latLngBounds(markers.map((m) => [m.latitude, m.longitude] as [number, number]))
        map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
    }, [markers, map])
    return null
}

/**
 * Карта с ценниками (A1/B4). Клик по ценнику пока ничего не делает (мини-карточка отложена).
 * Тайлы OpenStreetMap подходят для разработки; для продакшена с трафиком проверьте политику использования тайлов
 * или возьмите отдельного провайдера.
 */
export default function CarsMap({ markers, highlightedId }: Props) {
    const items = useMemo(
        () =>
            markers.map((m) => ({
                m,
                icon: priceIcon(m, m.id === highlightedId),
            })),
        [markers, highlightedId],
    )

    return (
        <MapContainer center={DEFAULT_CENTER} zoom={11} scrollWheelZoom className="size-full">
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <FitBounds markers={markers} />
            {items.map(({ m, icon }) => (
                <Marker
                    key={m.id}
                    position={[m.latitude, m.longitude]}
                    icon={icon}
                    interactive={false}
                    zIndexOffset={m.id === highlightedId ? 1000 : 0}
                />
            ))}
        </MapContainer>
    )
}