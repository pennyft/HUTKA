package com.hutka.backend.car;

import com.hutka.backend.car.catalog.CarCatalogFilter;
import com.hutka.backend.car.catalog.CatalogSort;
import com.hutka.backend.car.dto.CarMapMarkerResponse;
import com.hutka.backend.car.dto.CarResponse;
import com.hutka.backend.car.enums.FuelType;
import com.hutka.backend.car.enums.Transmission;
import com.hutka.backend.car.service.CarCatalogService;
import com.hutka.backend.car.service.CarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Раздел 23.2. Доступен гостю (см. SecurityConfig). */
@RestController
@RequestMapping("/cars")
@RequiredArgsConstructor
public class CarController {

    private final CarService carService;
    private final CarCatalogService catalogService;

    /**
     * Раздел 4.1. Фильтры: fuelType (petrol|diesel|electric|hybrid), transmission (auto|manual), seats (точное число),
     * bodyType, minPrice, maxPrice; q — поиск по марке и модели. Сортировка sort: rating (по умолчанию) | price_asc |
     * price_desc | distance (нужны lat и lng). Страницы: page (с 0) и size (по умолчанию 20, максимум 100).
     * Тело ответа — массив машин; общее число по фильтру — в заголовке X-Total-Count.
     */
    @GetMapping
    public ResponseEntity<List<CarResponse>> catalog(
            @RequestParam(required = false) FuelType fuelType,
            @RequestParam(required = false) Transmission transmission,
            @RequestParam(required = false) Integer seats,
            @RequestParam(required = false) String bodyType,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) CatalogSort sort,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        CarCatalogFilter filter = new CarCatalogFilter(fuelType, transmission, seats, bodyType, minPrice, maxPrice, q);
        CarCatalogService.CatalogPage result = catalogService.search(filter, sort, lat, lng, page, size);
        List<CarResponse> body = result.items().stream()
                .map(item -> toResponse(item.car(), item.distanceKm()))
                .toList();
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(result.total()))
                .body(body);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CarResponse> details(@PathVariable UUID id) {
        return ResponseEntity.ok(toResponse(carService.findPublicById(id), null));
    }

    /** Раздел 4.2. Те же фильтры, что у списка (без сортировки и страниц); только машины с координатами. */
    @GetMapping("/map")
    public ResponseEntity<List<CarMapMarkerResponse>> mapMarkers(
            @RequestParam(required = false) FuelType fuelType,
            @RequestParam(required = false) Transmission transmission,
            @RequestParam(required = false) Integer seats,
            @RequestParam(required = false) String bodyType,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice,
            @RequestParam(required = false) String q) {
        CarCatalogFilter filter = new CarCatalogFilter(fuelType, transmission, seats, bodyType, minPrice, maxPrice, q);
        List<CarMapMarkerResponse> response = catalogService.findMapCars(filter).stream()
                .map(car -> new CarMapMarkerResponse(
                        car.getId(), car.getLatitude(), car.getLongitude(),
                        car.getPricePerHour(), car.getStatus()))
                .toList();
        return ResponseEntity.ok(response);
    }

    static CarResponse toResponse(Car car, BigDecimal distanceKm) {
        return new CarResponse(
                car.getId(), car.getMake(), car.getModel(), car.getYear(), car.getMileageKm(),
                car.getFuelType(), car.getTransmission(), car.getSeats(), car.getBodyType(),
                car.getAddress(), car.getLatitude(), car.getLongitude(), car.getPricePerHour(),
                car.getDescription(), car.getPhotos(), car.getBookingMode(), car.getStatus(),
                car.getRatingAvg(), distanceKm
        );
    }
}
