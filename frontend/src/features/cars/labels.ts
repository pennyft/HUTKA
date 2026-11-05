import type { FuelType, Transmission } from '@/shared/types/car'

export const FUEL_LABEL: Record<FuelType, string> = {
  petrol: 'Бензин',
  diesel: 'Дизель',
  electric: 'Электро',
  hybrid: 'Гибрид',
}

export const TRANSMISSION_LABEL: Record<Transmission, string> = {
  auto: 'Автомат',
  manual: 'Механика',
}
