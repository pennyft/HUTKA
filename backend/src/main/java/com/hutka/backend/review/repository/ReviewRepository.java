package com.hutka.backend.review.repository;

import com.hutka.backend.review.entity.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    Optional<Review> findByBookingId(UUID bookingId);
    List<Review> findByCarId(UUID carId);
    List<Review> findByRevieweeId(UUID revieweeId);
    boolean existsByBookingId(UUID bookingId);

    @Query("SELECT AVG(r.carRating) FROM Review r WHERE r.car.id = :carId AND r.carRating IS NOT NULL")
    Double findAverageCarRating(@Param("carId") UUID carId);

    @Query("SELECT AVG(r.userRating) FROM Review r WHERE r.reviewee.id = :userId AND r.userRating IS NOT NULL")
    Double findAverageUserRating(@Param("userId") UUID userId);
}
