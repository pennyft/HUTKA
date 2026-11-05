import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { MAP_ATTRIBUTION, MAP_TILES_URL } from '@/shared/config/env'
import { priceIcon } from './mapIcons'

interface Props {
  latitude: number
  longitude: number
  price: number
}

/** Небольшая карта с ценником на странице машины. Колесо мыши не масштабирует карту, чтобы страница прокручивалась. */
export default function CarMiniMap({ latitude, longitude, price }: Props) {
  const position = L.latLng(Number(latitude), Number(longitude))
  return (
    // isolate: слои Leaflet иначе перекрывают шапку страницы
    <div className="isolate h-56 overflow-hidden rounded-2xl border border-line">
      <MapContainer center={position} zoom={15} scrollWheelZoom={false} className="size-full">
        <TileLayer url={MAP_TILES_URL} attribution={MAP_ATTRIBUTION} />
        <Marker position={position} icon={priceIcon(Number(price), 'active')} interactive={false} />
      </MapContainer>
    </div>
  )
}
