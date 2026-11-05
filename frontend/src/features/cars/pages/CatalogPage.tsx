import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { SearchX } from 'lucide-react'
import { errorMessage } from '@/api/errors'
import { useMediaQuery } from '@/shared/lib/useMediaQuery'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { toast } from '@/shared/ui/toast'
import type { Car } from '@/shared/types/car'
import { CarCard, CarCardSkeleton } from '../components/CarCard'
import { FilterBar } from '../components/FilterBar'
import { carsApi, PAGE_SIZE } from '../api'
import { filtersToQuery, hasActiveFilters, parseFilters, parseView, toSearchParams, type CatalogFilters, type SortKey, type View } from '../filters'
import { formatCarsCount } from '../format'
import { locate, type Coords } from '../geo'

// Карта (Leaflet) тяжёлая и нужна не сразу: грузим отдельным куском
const CatalogMap = lazy(() => import('../components/CatalogMap'))

/**
 * A1/B4. Каталог: список и карта. Фильтры и вид лежат в адресе (?fuelType=diesel&view=map).
 * На компьютере список и карта рядом, на телефоне переключаются кнопкой «Список / Карта».
 * Сортировка «ближайшие» требует координат (бэк иначе отвечает 400), поэтому геолокацию запрашиваем
 * только по явному выбору и держим в состоянии страницы, а не в адресе.
 */
export default function CatalogPage() {
  const [sp, setSp] = useSearchParams()
  const filters = useMemo(() => parseFilters(sp), [sp])
  const view = parseView(sp)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const showList = isDesktop || view === 'list'
  const showMap = isDesktop || view === 'map'

  const [coords, setCoords] = useState<Coords | null>(null)
  const [nearMe, setNearMe] = useState(false)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)

  const update = (patch: Partial<CatalogFilters>) => setSp(toSearchParams({ ...filters, ...patch }, view), { replace: true })
  const setView = (v: View) => setSp(toSearchParams(filters, v), { replace: true })

  async function onSort(value: SortKey | 'distance') {
    if (value === 'distance') {
      try {
        setCoords(coords ?? (await locate()))
        setNearMe(true)
      } catch (e) {
        toast.error(errorMessage(e))
      }
      return
    }
    setNearMe(false)
    update({ sort: value })
  }

  function reset() {
    setSp(new URLSearchParams(view === 'map' ? { view: 'map' } : {}), { replace: true })
    setNearMe(false)
    setResetKey((k) => k + 1)
  }

  const common = filtersToQuery(filters)
  const listQuery = {
    ...common,
    sort: nearMe ? 'distance' : filters.sort,
    // координаты шлём, если они есть: тогда в карточках показывается расстояние
    lat: coords?.lat,
    lng: coords?.lng,
  }

  const list = useInfiniteQuery({
    queryKey: ['cars', 'list', listQuery],
    queryFn: ({ pageParam, signal }) => carsApi.list({ ...listQuery, page: pageParam, size: PAGE_SIZE }, signal),
    initialPageParam: 0,
    getNextPageParam: (last, all) => {
      const loaded = all.reduce((n, p) => n + p.data.length, 0)
      return last.data.length > 0 && loaded < last.total ? all.length : undefined
    },
    placeholderData: keepPreviousData,
  })

  const markers = useQuery({
    queryKey: ['cars', 'map', common],
    queryFn: ({ signal }) => carsApi.map(common, signal),
    placeholderData: keepPreviousData,
    enabled: showMap,
  })

  const cars: Car[] = list.data?.pages.flatMap((p) => p.data) ?? []
  const total = list.data?.pages.at(-1)?.total ?? 0

  // Данные выбранной машины берём из загруженного списка, иначе запрашиваем (маркер знает только цену и координаты)
  const fromList = selectedId ? cars.find((c) => c.id === selectedId) : undefined
  const fetched = useQuery({
    queryKey: ['car', selectedId],
    queryFn: ({ signal }) => carsApi.details(selectedId!, signal),
    enabled: !!selectedId && !fromList,
  })
  const selectedCar = fromList ?? fetched.data

  return (
    <div className="mx-auto max-w-[1500px] px-4 pb-8">
      <FilterBar
        filters={filters}
        nearMe={nearMe}
        view={view}
        hasActive={hasActiveFilters(filters)}
        resetKey={resetKey}
        onChange={update}
        onSort={onSort}
        onView={setView}
        onReset={reset}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {showList && (
          <section aria-label="Список машин" className="min-w-0">
            {list.isPending ? (
              <Grid>
                {Array.from({ length: 6 }, (_, i) => (
                  <CarCardSkeleton key={i} />
                ))}
              </Grid>
            ) : list.isError ? (
              <Notice title="Не удалось загрузить каталог" text={errorMessage(list.error)}>
                <Button variant="dark" onClick={() => list.refetch()} className="sm:w-auto">
                  Повторить
                </Button>
              </Notice>
            ) : cars.length === 0 ? (
              <Notice title="Ничего не найдено" text="Попробуйте изменить фильтры или поисковый запрос.">
                {hasActiveFilters(filters) && (
                  <Button variant="dark" onClick={reset} className="sm:w-auto">
                    Сбросить фильтры
                  </Button>
                )}
              </Notice>
            ) : (
              <>
                <p className="mb-3 text-sm text-muted" aria-live="polite">
                  {formatCarsCount(total)}
                </p>
                <Grid>
                  {cars.map((car) => (
                    <CarCard key={car.id} car={car} highlighted={car.id === selectedId} onHover={setHoverId} />
                  ))}
                </Grid>
                {list.hasNextPage && (
                  <div className="mt-6 flex flex-col items-center gap-2">
                    <p className="text-xs text-muted">
                      Показано {cars.length} из {total}
                    </p>
                    <Button variant="outline" loading={list.isFetchingNextPage} onClick={() => list.fetchNextPage()} className="sm:w-auto sm:px-8">
                      Показать ещё
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {showMap && (
          <section aria-label="Карта" className="h-[calc(100dvh-15rem)] min-h-[360px] lg:sticky lg:top-[72px] lg:h-[calc(100dvh-88px)]">
            <Suspense fallback={<Skeleton className="size-full rounded-2xl" />}>
              <CatalogMap
                markers={markers.data ?? []}
                loading={markers.isFetching}
                hoverId={hoverId}
                selectedId={selectedId}
                selectedCar={selectedCar}
                onSelect={setSelectedId}
              />
            </Suspense>
          </section>
        )}
      </div>
    </div>
  )
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">{children}</div>
}

function Notice({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-8">
      <SearchX className="mb-3 size-6 text-muted" aria-hidden />
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      <p className="mt-1 text-sm text-muted">{text}</p>
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}
