package com.hutka.backend.grouptrips;

import com.hutka.backend.grouptrips.enums.GroupTripStatus;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.Collection;
import java.util.UUID;

/** Фильтры списка поездок. Specification, а не JPQL с «:param is null» — как в BookingSpecifications. */
public final class GroupTripSpecifications {

    private GroupTripSpecifications() {}

    public static Specification<GroupTrip> statusIn(Collection<GroupTripStatus> statuses) {
        return (root, query, cb) -> root.get("status").in(statuses);
    }

    public static Specification<GroupTrip> status(GroupTripStatus status) {
        return status == null ? any() : (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    /** Поездка не раньше сегодняшнего дня (поездки, которые sweeper ещё не успел перевести в finished, в общий список не попадают). */
    public static Specification<GroupTrip> dateFrom(LocalDate today) {
        return (root, query, cb) -> cb.greaterThanOrEqualTo(root.get("tripDate"), today);
    }

    /** Пользователь — участник поездки (в том числе организатор: у него есть своя строка участника). */
    public static Specification<GroupTrip> participant(UUID userId) {
        return (root, query, cb) -> {
            Subquery<Long> sub = query.subquery(Long.class);
            Root<GroupTripParticipant> p = sub.from(GroupTripParticipant.class);
            sub.select(cb.literal(1L)).where(
                    cb.equal(p.get("tripId"), root.get("id")),
                    cb.equal(p.get("userId"), userId));
            return cb.exists(sub);
        };
    }

    private static Specification<GroupTrip> any() {
        return (root, query, cb) -> cb.conjunction();
    }
}
