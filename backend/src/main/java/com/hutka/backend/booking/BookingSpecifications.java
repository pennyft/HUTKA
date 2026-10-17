package com.hutka.backend.booking;

import com.hutka.backend.booking.enums.BookingStatus;
import org.springframework.data.jpa.domain.Specification;

import java.time.Instant;
import java.util.Collection;
import java.util.UUID;

/**
 * Динамические фильтры списков броней. Specification, а не JPQL с «:param is null»:
 * PostgreSQL не всегда может определить тип null-параметра в таком выражении.
 * Те же фильтры понадобятся админке (раздел 16.4: статус, дата, пользователь).
 */
public final class BookingSpecifications {

    private BookingSpecifications() {}

    public static Specification<Booking> renter(UUID renterId) {
        return (root, query, cb) -> cb.equal(root.get("renterId"), renterId);
    }

    public static Specification<Booking> carIn(Collection<UUID> carIds) {
        return (root, query, cb) -> root.get("carId").in(carIds);
    }

    public static Specification<Booking> car(UUID carId) {
        return carId == null ? any() : (root, query, cb) -> cb.equal(root.get("carId"), carId);
    }

    public static Specification<Booking> status(BookingStatus status) {
        return status == null ? any() : (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    /** Фильтр «по дате» — по planned_start_at, полуинтервал [from, to). */
    public static Specification<Booking> plannedStartFrom(Instant from) {
        return from == null ? any() : (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("plannedStartAt"), from);
    }

    public static Specification<Booking> plannedStartBefore(Instant to) {
        return to == null ? any() : (root, query, cb) -> cb.lessThan(root.get("plannedStartAt"), to);
    }

    private static Specification<Booking> any() {
        return (root, query, cb) -> cb.conjunction();
    }
}
