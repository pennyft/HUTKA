package com.hutka.backend.review;

import com.hutka.backend.booking.entity.Booking;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.booking.repository.BookingRepository;
import com.hutka.backend.car.entity.Car;
import com.hutka.backend.car.repository.CarRepository;
import com.hutka.backend.exception.BadRequestException;
import com.hutka.backend.exception.ConflictException;
import com.hutka.backend.exception.ForbiddenException;
import com.hutka.backend.exception.NotFoundException;
import com.hutka.backend.review.dto.ReviewRequest;
import com.hutka.backend.review.dto.ReviewResponse;
import com.hutka.backend.review.entity.Review;
import com.hutka.backend.review.repository.ReviewRepository;
import com.hutka.backend.user.User;
import com.hutka.backend.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final CarRepository carRepository;
    private final UserRepository userRepository;

    // ───── АРЕНДАТОР оставляет отзыв на машину ─────

    public ReviewResponse leaveCarReview(ReviewRequest request, UUID reviewerId) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new NotFoundException("Booking not found"));

        if (!booking.getRenter().getId().equals(reviewerId)) {
            throw new ForbiddenException("Access denied");
        }

        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new BadRequestException("Can only review completed bookings");
        }

        if (reviewRepository.existsByBookingId(booking.getId())) {
            throw new ConflictException("Review already exists for this booking");
        }

        if (request.getCarRating() == null || request.getCarRating() < 1 || request.getCarRating() > 5) {
            throw new BadRequestException("Car rating must be between 1 and 5");
        }

        Review review = Review.builder()
                .booking(booking)
                .car(booking.getCar())
                .reviewer(booking.getRenter())
                .reviewee(booking.getCar().getOwner())
                .carRating(request.getCarRating())
                .carComment(request.getCarComment())
                .build();

        reviewRepository.save(review);
        recalculateCarRating(booking.getCar().getId());

        return toReviewResponse(review);
    }

    // ───── ПАРТНЁР оставляет отзыв на арендатора ─────

    public ReviewResponse leaveUserReview(ReviewRequest request, UUID reviewerId) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new NotFoundException("Booking not found"));

        if (!booking.getCar().getOwner().getId().equals(reviewerId)) {
            throw new ForbiddenException("Access denied");
        }

        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new BadRequestException("Can only review completed bookings");
        }

        if (request.getUserRating() == null || request.getUserRating() < 1 || request.getUserRating() > 5) {
            throw new BadRequestException("User rating must be between 1 and 5");
        }

        Review review = reviewRepository.findByBookingId(booking.getId()).orElse(null);

        if (review != null && review.getUserRating() != null) {
            throw new ConflictException("User review already submitted for this booking");
        }

        if (review == null) {
            review = Review.builder()
                    .booking(booking)
                    .car(booking.getCar())
                    .reviewer(booking.getCar().getOwner())
                    .reviewee(booking.getRenter())
                    .build();
        }

        review.setUserRating(request.getUserRating());
        review.setUserComment(request.getUserComment());

        reviewRepository.save(review);
        recalculateUserRating(booking.getRenter().getId());

        return toReviewResponse(review);
    }

    // ───── ПОЛУЧЕНИЕ ОТЗЫВОВ ─────

    public List<ReviewResponse> getReviewsByCar(UUID carId) {
        return reviewRepository.findByCarId(carId)
                .stream()
                .map(this::toReviewResponse)
                .toList();
    }

    public List<ReviewResponse> getReviewsByUser(UUID userId) {
        return reviewRepository.findByRevieweeId(userId)
                .stream()
                .map(this::toReviewResponse)
                .toList();
    }

    // ───── ПРИВАТНЫЕ МЕТОДЫ ─────

    private void recalculateCarRating(UUID carId) {
        Double avg = reviewRepository.findAverageCarRating(carId);
        if (avg != null) {
            Car car = carRepository.findById(carId)
                    .orElseThrow(() -> new NotFoundException("Car not found"));
            car.setRating(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
            carRepository.save(car);
        }
    }

    private void recalculateUserRating(UUID userId) {
        Double avg = reviewRepository.findAverageUserRating(userId);
        if (avg != null) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new NotFoundException("User not found"));
            user.setRating(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
            userRepository.save(user);
        }
    }

    private ReviewResponse toReviewResponse(Review review) {
        ReviewResponse response = new ReviewResponse();
        response.setId(review.getId());
        response.setBookingId(review.getBooking().getId());
        response.setCarId(review.getCar().getId());
        response.setReviewerId(review.getReviewer().getId());
        response.setRevieweeId(review.getReviewee().getId());
        response.setCarRating(review.getCarRating());
        response.setCarComment(review.getCarComment());
        response.setUserRating(review.getUserRating());
        response.setUserComment(review.getUserComment());
        response.setCreatedAt(review.getCreatedAt());
        return response;
    }
}
