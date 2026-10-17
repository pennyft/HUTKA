package com.hutka.backend.car.service;

import com.hutka.backend.ai.service.CarSearchPort;
import com.hutka.backend.car.catalog.CarCatalogFilter;
import com.hutka.backend.car.catalog.CatalogSort;
import com.hutka.backend.car.enums.FuelType;
import com.hutka.backend.car.enums.Transmission;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;

/**
 * Реализация порта ai → car (раздел 11.1). Подбор идёт через тот же CarCatalogService.search, что и GET /cars (4.1):
 * AI видит только одобренные и не скрытые машины и не может показать машину, которой нет в каталоге.
 * Сортировка — по рейтингу (по умолчанию каталога); значения enum, которых нет в системе, игнорируются, а не ломают поиск.
 */
@Component
@RequiredArgsConstructor
public class AiCarSearchPort implements CarSearchPort {

    private final CarCatalogService catalog;

    @Override
    public List<CarHit> search(CarSearchQuery q, int limit) {
        BigDecimal min = q.minPrice();
        BigDecimal max = q.maxPrice();
        // Модель могла перепутать границы; каталог на такой запрос ответил бы 400, а для чата разумнее поменять местами
        if (min != null && max != null && min.compareTo(max) > 0) {
            BigDecimal tmp = min;
            min = max;
            max = tmp;
        }
        CarCatalogFilter filter = new CarCatalogFilter(fuel(q.fuelType()), transmission(q.transmission()),
                q.seats(), q.bodyType(), min, max, q.text());
        return catalog.search(filter, CatalogSort.rating, null, null, 0, limit).items().stream()
                .map(item -> new CarHit(item.car().getId(), item.car().getMake(), item.car().getModel(),
                        item.car().getYear(), item.car().getPricePerHour(), item.car().getSeats(),
                        item.car().getFuelType().name(), item.car().getTransmission().name(), item.car().getBodyType(),
                        item.car().getRatingAvg(),
                        item.car().getPhotos().isEmpty() ? null : item.car().getPhotos().get(0)))
                .toList();
    }

    private static FuelType fuel(String raw) {
        try {
            return raw == null ? null : FuelType.valueOf(raw.toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private static Transmission transmission(String raw) {
        try {
            return raw == null ? null : Transmission.valueOf(raw.toLowerCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
