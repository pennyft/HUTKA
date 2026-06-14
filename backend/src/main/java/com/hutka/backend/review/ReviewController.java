package com.hutka.backend.review;

import com.hutka.backend.review.dto.ReviewRequest;
import com.hutka.backend.review.dto.ReviewResponse;
import com.hutka.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    // ───── АРЕНДАТОР ─────

    @PostMapping("/car")
    public ResponseEntity<ReviewResponse> leaveCarReview(
            @RequestBody ReviewRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(reviewService.leaveCarReview(request, user.getId()));
    }

    // ───── ПАРТНЁР ─────

    @PostMapping("/user")
    @PreAuthorize("hasAnyRole('PARTNER', 'ADMIN')")
    public ResponseEntity<ReviewResponse> leaveUserReview(
            @RequestBody ReviewRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(reviewService.leaveUserReview(request, user.getId()));
    }

    // ───── ОБЩИЕ ─────

    @GetMapping("/car/{carId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByCar(@PathVariable UUID carId) {
        return ResponseEntity.ok(reviewService.getReviewsByCar(carId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ReviewResponse>> getReviewsByUser(@PathVariable UUID userId) {
        return ResponseEntity.ok(reviewService.getReviewsByUser(userId));
    }
}
