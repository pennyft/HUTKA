export interface Coords {
  lat: number
  lng: number
}

/** Текущее положение пользователя. Запрашиваем только по явному выбору «Ближайшие», а не при открытии страницы. */
export function locate(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Геолокация недоступна в этом браузере'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error('Не удалось определить местоположение. Разрешите доступ к геолокации в браузере.')),
      { timeout: 10_000, maximumAge: 300_000 },
    )
  })
}
