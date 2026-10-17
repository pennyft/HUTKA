package com.hutka.backend.ratings;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface RatingRepository extends JpaRepository<Rating, UUID> {

    boolean existsByBookingIdAndFromUserIdAndToUserId(UUID bookingId, UUID fromUserId, UUID toUserId);

    boolean existsByBookingIdAndFromUserIdAndToCarId(UUID bookingId, UUID fromUserId, UUID toCarId);

    @Query("select coalesce(sum(r.score), 0L) as totalScore, count(r) as ratingsCount from Rating r where r.toUserId = :id")
    RatingStats statsForUser(@Param("id") UUID id);

    @Query("select coalesce(sum(r.score), 0L) as totalScore, count(r) as ratingsCount from Rating r where r.toCarId = :id")
    RatingStats statsForCar(@Param("id") UUID id);

    List<Rating> findByToUserIdOrderByCreatedAtDesc(UUID toUserId, Pageable pageable);

    List<Rating> findByToCarIdOrderByCreatedAtDesc(UUID toCarId, Pageable pageable);

    /** Оценки, которые автор уже оставил по перечисленным броням (для списка «ещё не оценено»). */
    List<Rating> findByFromUserIdAndBookingIdIn(UUID fromUserId, Collection<UUID> bookingIds);
}
