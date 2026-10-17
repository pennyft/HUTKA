package com.hutka.backend.car.catalog;

import com.hutka.backend.car.Car;
import com.hutka.backend.car.enums.ModerationStatus;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Раздел 4.1: условия выборки каталога. Базовое условие — машина одобрена и не скрыта (как и раньше в CarService.findCatalog). */
public final class CarSpecifications {

    private CarSpecifications() {}

    /** @param requireCoordinates true — только машины с координатами (для карты, раздел 4.2) */
    public static Specification<Car> catalog(CarCatalogFilter filter, boolean requireCoordinates) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("moderationStatus"), ModerationStatus.approved));
            predicates.add(cb.isFalse(root.<Boolean>get("hidden")));
            if (requireCoordinates) {
                predicates.add(cb.isNotNull(root.get("latitude")));
                predicates.add(cb.isNotNull(root.get("longitude")));
            }
            if (filter.fuelType() != null) {
                predicates.add(cb.equal(root.get("fuelType"), filter.fuelType()));
            }
            if (filter.transmission() != null) {
                predicates.add(cb.equal(root.get("transmission"), filter.transmission()));
            }
            if (filter.seats() != null) {
                predicates.add(cb.equal(root.get("seats"), filter.seats()));
            }
            if (filter.bodyType() != null && !filter.bodyType().isBlank()) {
                predicates.add(cb.equal(cb.lower(root.<String>get("bodyType")),
                        filter.bodyType().trim().toLowerCase(Locale.ROOT)));
            }
            BigDecimal minPrice = filter.minPrice();
            if (minPrice != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.<BigDecimal>get("pricePerHour"), minPrice));
            }
            BigDecimal maxPrice = filter.maxPrice();
            if (maxPrice != null) {
                predicates.add(cb.lessThanOrEqualTo(root.<BigDecimal>get("pricePerHour"), maxPrice));
            }
            // Поиск: каждое слово запроса должно встретиться в марке или в модели
            Expression<String> make = cb.lower(root.<String>get("make"));
            Expression<String> model = cb.lower(root.<String>get("model"));
            for (String token : CatalogSearchText.tokens(filter.q())) {
                String pattern = CatalogSearchText.likeContains(token);
                predicates.add(cb.or(cb.like(make, pattern, '\\'), cb.like(model, pattern, '\\')));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
