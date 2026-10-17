package com.hutka.backend.car.service;

import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.car.catalog.CarCatalogFilter;
import com.hutka.backend.car.catalog.CarSpecifications;
import com.hutka.backend.car.catalog.CatalogCandidate;
import com.hutka.backend.car.catalog.CatalogRanking;
import com.hutka.backend.car.catalog.CatalogSort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Раздел 4.1 (список с фильтрами, сортировкой, поиском) и 4.2 (маркеры карты). Условия выборки — в БД
 * (CarSpecifications), порядок и постраничная выдача — в памяти (CatalogRanking): для сортировки по расстоянию
 * и по рейтингу с понижением нужны значения, которых нет в таблице cars. Рассчитано на каталог в сотни машин;
 * если каталог вырастет, цену и рейтинг можно перенести в запрос (см. docs/CATALOG_DECISIONS.md).
 */
@Service
@RequiredArgsConstructor
public class CarCatalogService {

    private static final int MAX_PAGE_SIZE = 100;

    private final CarRepository carRepository;
    private final CarRatingsPort ratingsPort;

    /** distanceKm — расстояние до точки пользователя (если переданы lat и lng), иначе null. */
    public record CatalogItem(Car car, BigDecimal distanceKm) {}

    /** total — число машин по фильтру (до разбиения на страницы). */
    public record CatalogPage(long total, List<CatalogItem> items) {}

    @Transactional(readOnly = true)
    public CatalogPage search(CarCatalogFilter filter, CatalogSort sort, Double lat, Double lng, int page, int size) {
        validateFilter(filter);
        CatalogSort effectiveSort = sort == null ? CatalogSort.rating : sort;
        boolean hasLocation = validateLocation(effectiveSort, lat, lng);

        // Sort.unsorted() выбирает перегрузку findAll(spec, sort) с @EntityGraph: фото загружаются сразу
        List<Car> cars = carRepository.findAll(CarSpecifications.catalog(filter, false), Sort.unsorted());

        Map<UUID, CarRatingsPort.CarRating> ratings = effectiveSort == CatalogSort.rating
                ? ratingsPort.ratingsFor(cars.stream().map(Car::getId).toList())
                : Map.of();
        List<CatalogCandidate> candidates = cars.stream()
                .map(car -> toCandidate(car, ratings.get(car.getId())))
                .toList();

        List<CatalogCandidate> sorted = CatalogRanking.sort(candidates, effectiveSort, lat, lng);
        Map<UUID, BigDecimal> distances = hasLocation ? CatalogRanking.distances(candidates, lat, lng) : Map.of();
        Map<UUID, Car> byId = cars.stream().collect(Collectors.toMap(Car::getId, Function.identity()));

        int pageSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        int from = (int) Math.min((long) Math.max(page, 0) * pageSize, sorted.size());
        int to = Math.min(from + pageSize, sorted.size());
        List<CatalogItem> items = sorted.subList(from, to).stream()
                .map(candidate -> new CatalogItem(byId.get(candidate.id()), distances.get(candidate.id())))
                .toList();
        return new CatalogPage(sorted.size(), items);
    }

    /** Раздел 4.2: машины с координатами по тем же фильтрам, что и список (сортировки и страниц у карты нет). */
    @Transactional(readOnly = true)
    public List<Car> findMapCars(CarCatalogFilter filter) {
        validateFilter(filter);
        return carRepository.findAll(CarSpecifications.catalog(filter, true));
    }

    private static CatalogCandidate toCandidate(Car car, CarRatingsPort.CarRating rating) {
        return new CatalogCandidate(car.getId(), car.getPricePerHour(), car.getCreatedAt(),
                car.getLatitude(), car.getLongitude(),
                rating == null ? null : rating.average(),
                rating != null && rating.sufficient(),
                rating != null && rating.belowThreshold());
    }

    private static void validateFilter(CarCatalogFilter filter) {
        if (filter.minPrice() != null && filter.maxPrice() != null && filter.minPrice().compareTo(filter.maxPrice()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Минимальная цена больше максимальной");
        }
    }

    /** @return true, если переданы корректные координаты пользователя */
    private static boolean validateLocation(CatalogSort sort, Double lat, Double lng) {
        if (lat == null && lng == null) {
            if (sort == CatalogSort.distance) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Для сортировки по расстоянию передайте координаты: lat и lng");
            }
            return false;
        }
        if (lat == null || lng == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Передайте обе координаты: lat и lng");
        }
        if (lat.isNaN() || lng.isNaN() || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Координаты вне допустимых границ (lat от -90 до 90, lng от -180 до 180)");
        }
        return true;
    }
}
