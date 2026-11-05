/**
 * Предварительная стоимость брони по формуле бэка (booking/service/PricingService.estimate):
 * секунды × цена за час / 3600, округление до копеек HALF_UP (до половины вверх).
 * Считаем в целых копейках, чтобы не накапливать погрешность чисел с плавающей точкой.
 * Сервер всё равно считает сам, это значение показывается только до отправки формы.
 */
export function estimateAmount(start: Date, end: Date, pricePerHour: number): number {
  const seconds = Math.floor((end.getTime() - start.getTime()) / 1000)
  if (seconds <= 0) return 0
  const kopecksPerHour = Math.round(pricePerHour * 100)
  const numerator = seconds * kopecksPerHour
  const denominator = 3600
  // округление половины вверх на целых числах: floor((2n + d) / 2d)
  const kopecks = Math.floor((2 * numerator + denominator) / (2 * denominator))
  return kopecks / 100
}

/** Длительность в минутах между двумя моментами (может быть отрицательной). */
export function durationMinutes(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60_000)
}
