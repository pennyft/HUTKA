import { useQuery } from '@tanstack/react-query'
import { errorMessage } from '@/api/errors'
import { bookingsApi } from '@/features/bookings/api'
import { useCarsById } from '@/features/bookings/hooks'
import { useNow } from '@/features/bookings/useNow'
import { useMe } from '@/features/auth/hooks'
import { useUnreadCount } from '@/shared/nav/useNavData'
import { Button } from '@/shared/ui/Button'
import { Skeleton } from '@/shared/ui/Skeleton'
import { FooterRows, PartnerRow, RateRow } from '../components/FooterRows'
import { StatusPills } from '../components/StatusPills'
import { EmptyHero, LicenseHero, TripHero } from '../components/TripHero'
import { UpcomingTrips } from '../components/UpcomingTrips'
import { WeatherStrip } from '../components/WeatherStrip'
import { useForecast, usePddSummary } from '../hooks'
import { dateLine, distinctBookings, greeting, pickHero } from '../logic'

/**
 * B1. Главная арендатора. Отдельного API нет, экран собирается из запросов: брони, ожидающие оценки, скидка ПДД,
 * прогноз, число непрочитанных. Всё, что требует подтверждённого ВУ (брони, оценки, ПДД), запрашивается только для
 * verified: иначе бэк отвечает 403. Неподтверждённому вместо поездок показывается карточка верификации.
 * Прогноз не обязателен: если он не загрузился, строки погоды и подписей к поездкам просто нет.
 */
export default function RenterDashboardPage() {
    const { data: me } = useMe()
    const now = useNow(30_000)
    const verified = me?.verificationStatus === 'verified'

    const bookingsQ = useQuery({
        queryKey: ['bookings', 'list'],
        queryFn: ({ signal }) => bookingsApi.list(undefined, signal),
        enabled: verified,
        refetchInterval: 60_000,
    })
    const ratingsQ = useQuery({ queryKey: ['ratings', 'pending'], queryFn: ({ signal }) => bookingsApi.pendingRatings(signal), enabled: verified })
    const pddQ = usePddSummary(verified)
    const forecastQ = useForecast()
    const unread = useUnreadCount()

    const { hero, upcoming } = pickHero(bookingsQ.data ?? [])
    const shown = upcoming.slice(0, 3)
    const ratingBookings = distinctBookings(ratingsQ.data ?? [])
    const firstRating = (ratingsQ.data ?? []).find((p) => p.bookingId === ratingBookings[0])
    const carIds = [hero?.booking.carId, ...shown.map((b) => b.carId), firstRating?.carId].filter((id): id is string => !!id)
    const cars = useCarsById(carIds)
    const ratingCar = firstRating ? cars[firstRating.carId]?.car : undefined

    return (
        <div className="mx-auto max-w-2xl space-y-4 px-4 pb-10 pt-6">
            <header>
                <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-fg">
                    {greeting(now)}
                    {me ? `, ${me.firstName}` : ''}
                </h1>
                <p className="mt-0.5 text-muted">{dateLine(now)}</p>
            </header>

            {forecastQ.isPending ? <Skeleton className="h-28 w-full rounded-3xl" /> : forecastQ.data && forecastQ.data.length > 0 ? <WeatherStrip days={forecastQ.data} now={now} /> : null}

            <StatusPills
                discount={pddQ.data?.activeDiscount ?? null}
                invite={!!pddQ.data && pddQ.data.cycle.attemptsLeft > 0}
                unread={unread}
                ratingBookings={ratingBookings}
                now={now}
            />

            {!me ? (
                <Skeleton className="h-44 w-full rounded-3xl" />
            ) : !verified ? (
                <LicenseHero status={me.verificationStatus === 'pending' ? 'pending' : 'unverified'} />
            ) : bookingsQ.isPending ? (
                <Skeleton className="h-44 w-full rounded-3xl" />
            ) : bookingsQ.isError ? (
                <div className="rounded-3xl border border-line bg-surface p-6">
                    <h2 className="text-lg font-bold text-fg">Не удалось загрузить поездки</h2>
                    <p className="mt-1 text-sm text-muted">{errorMessage(bookingsQ.error)}</p>
                    <div className="mt-4">
                        <Button variant="dark" onClick={() => bookingsQ.refetch()} className="sm:w-auto">
                            Повторить
                        </Button>
                    </div>
                </div>
            ) : (
                <>
                    {hero ? <TripHero hero={hero} lookup={cars[hero.booking.carId]} now={now} /> : <EmptyHero />}
                    <UpcomingTrips trips={shown} cars={cars} days={forecastQ.data} />
                </>
            )}

            <FooterRows>
                {verified && firstRating && <RateRow bookingId={firstRating.bookingId} carName={ratingCar ? `${ratingCar.make} ${ratingCar.model}` : null} finishedAt={firstRating.finishedAt} />}
                {verified && me && !me.isPartner && <PartnerRow />}
            </FooterRows>
        </div>
    )
}