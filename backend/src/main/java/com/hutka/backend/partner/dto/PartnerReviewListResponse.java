package com.hutka.backend.partner.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Раздел 10.5: все отзывы арендаторов в одном месте. carId = null — оценка самого партнёра, иначе — оценка машины. */
public record PartnerReviewListResponse(long total, List<Item> items) {

    public record Item(UUID id, UUID bookingId, UUID carId, String car, int score, String comment, Instant createdAt,
                       String authorFirstName) {}
}
