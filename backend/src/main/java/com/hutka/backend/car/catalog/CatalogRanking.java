package com.hutka.backend.car.catalog;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Раздел 4.1 (сортировка) и 7.1 (машина с низким рейтингом выпадает из топа выдачи). Чистая логика без Spring и БД.
 *
 * rating (порядок по умолчанию): сначала машины с достаточным числом оценок и рейтингом не ниже порога (по убыванию рейтинга),
 * затем «нейтральные» — оценок мало или нет (по убыванию даты добавления), в конце — машины с рейтингом ниже порога.
 * Выпадение из топа применяется только к этому порядку: цена и расстояние — выбор самого пользователя, он их не переопределяется.
 */
public final class CatalogRanking {

    static final double EARTH_RADIUS_KM = 6371.0088;

    private CatalogRanking() {}

    public static List<CatalogCandidate> sort(List<CatalogCandidate> items, CatalogSort sort, Double lat, Double lng) {
        List<CatalogCandidate> result = new ArrayList<>(items);
        Comparator<CatalogCandidate> newestFirst = Comparator
                .comparing(CatalogCandidate::createdAt, Comparator.nullsLast(Comparator.<Instant>reverseOrder()))
                .thenComparing(CatalogCandidate::id);
        switch (sort) {
            case price_asc -> result.sort(Comparator
                    .comparing(CatalogCandidate::pricePerHour, Comparator.nullsLast(Comparator.<BigDecimal>naturalOrder()))
                    .thenComparing(newestFirst));
            case price_desc -> result.sort(Comparator
                    .comparing(CatalogCandidate::pricePerHour, Comparator.nullsLast(Comparator.<BigDecimal>reverseOrder()))
                    .thenComparing(newestFirst));
            case distance -> {
                if (lat == null || lng == null) {
                    throw new IllegalArgumentException("Для сортировки по расстоянию нужны координаты");
                }
                Map<UUID, Double> km = distancesKm(items, lat, lng);
                result.sort(Comparator
                        .comparing((CatalogCandidate c) -> km.get(c.id()), Comparator.nullsLast(Comparator.<Double>naturalOrder()))
                        .thenComparing(CatalogCandidate::pricePerHour, Comparator.nullsLast(Comparator.<BigDecimal>naturalOrder()))
                        .thenComparing(CatalogCandidate::id));
            }
            case rating -> result.sort(Comparator
                    .comparingInt(CatalogRanking::ratingGroup)
                    // у «нейтральных» (группа 1) рейтинг не учитывается: оценок слишком мало, чтобы он что-то значил
                    .thenComparing(c -> c.ratingSufficient() ? c.rating() : null,
                            Comparator.nullsLast(Comparator.<BigDecimal>reverseOrder()))
                    .thenComparing(newestFirst));
        }
        return result;
    }

    /** Расстояние в километрах (1 знак) для машин с координатами; без координат — машины в карту не попадают. */
    public static Map<UUID, BigDecimal> distances(List<CatalogCandidate> items, double lat, double lng) {
        Map<UUID, BigDecimal> result = new HashMap<>();
        distancesKm(items, lat, lng).forEach((id, km) ->
                result.put(id, BigDecimal.valueOf(km).setScale(1, RoundingMode.HALF_UP)));
        return result;
    }

    /** Формула гаверсинусов: расстояние по поверхности шара радиусом 6371.0088 км. */
    public static double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1.0, Math.sqrt(a)));
    }

    private static Map<UUID, Double> distancesKm(List<CatalogCandidate> items, double lat, double lng) {
        Map<UUID, Double> result = new HashMap<>();
        for (CatalogCandidate c : items) {
            if (c.latitude() != null && c.longitude() != null) {
                result.put(c.id(), distanceKm(lat, lng, c.latitude().doubleValue(), c.longitude().doubleValue()));
            }
        }
        return result;
    }

    /** 0 — достаточно оценок, рейтинг не ниже порога; 1 — нейтральная; 2 — ниже порога. */
    private static int ratingGroup(CatalogCandidate c) {
        if (c.belowThreshold()) {
            return 2;
        }
        if (!c.ratingSufficient() || c.rating() == null) {
            return 1;
        }
        return 0;
    }
}
