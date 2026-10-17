package com.hutka.backend.grouptrips;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface GroupTripParticipantRepository extends JpaRepository<GroupTripParticipant, UUID> {

    boolean existsByTripIdAndUserId(UUID tripId, UUID userId);

    long countByTripId(UUID tripId);

    List<GroupTripParticipant> findByTripIdOrderByJoinedAtAscIdAsc(UUID tripId);

    /** В каких из этих поездок участвует пользователь (признак «вы участвуете» в списке). */
    List<GroupTripParticipant> findByUserIdAndTripIdIn(UUID userId, Collection<UUID> tripIds);

    /** Число участников сразу для страницы поездок (без N+1). */
    @Query("""
            select p.tripId as tripId, count(p) as total
            from GroupTripParticipant p
            where p.tripId in :tripIds
            group by p.tripId
            """)
    List<TripCount> countByTripIds(@Param("tripIds") Collection<UUID> tripIds);

    interface TripCount {
        UUID getTripId();

        Long getTotal();
    }
}
