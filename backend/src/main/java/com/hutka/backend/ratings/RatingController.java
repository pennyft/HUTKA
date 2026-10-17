package com.hutka.backend.ratings;

import com.hutka.backend.ratings.dto.CreateRatingRequest;
import com.hutka.backend.ratings.dto.PendingRatingResponse;
import com.hutka.backend.ratings.dto.RatingListResponse;
import com.hutka.backend.ratings.dto.RatingResponse;
import com.hutka.backend.ratings.service.RatingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/** Раздел 23.9. Принципал — UUID пользователя из JwtAuthFilter. */
@RestController
@RequestMapping("/ratings")
@RequiredArgsConstructor
public class RatingController {

    private final RatingService ratingService;

    /** Оценка (1–5 + комментарий) по завершённой поездке (7). */
    @PostMapping
    public ResponseEntity<RatingResponse> create(@AuthenticationPrincipal UUID userId,
                                                 @Valid @RequestBody CreateRatingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ratingService.create(userId, request));
    }

    /** Публичные оценки по пользователю или машине (7.1): ровно один из userId / carId. */
    @GetMapping
    public RatingListResponse list(@RequestParam(required = false) UUID userId,
                                   @RequestParam(required = false) UUID carId,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "20") int size) {
        return ratingService.list(userId, carId, page, size);
    }

    /** Оценки, которые текущему пользователю ещё нужно оставить. */
    @GetMapping("/pending")
    public List<PendingRatingResponse> pending(@AuthenticationPrincipal UUID userId) {
        return ratingService.pending(userId);
    }
}
