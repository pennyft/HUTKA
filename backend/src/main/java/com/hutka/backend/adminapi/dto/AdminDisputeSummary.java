package com.hutka.backend.adminapi.dto;

import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.disputes.enums.DisputeDecision;
import com.hutka.backend.disputes.enums.DisputeStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Строка очереди споров и истории решений (16.6). decision, damageAmount и resolvedAt заполнены только у решённых споров. */
public record AdminDisputeSummary(
        UUID id,
        UUID bookingId,
        DisputeStatus status,
        DisputeDecision decision,
        BigDecimal damageAmount,
        Instant createdAt,
        Instant resolvedAt,
        UUID carId,
        String car,
        String renterName,
        String partnerName,
        BookingStatus bookingStatus,
        Instant plannedEndAt) {}
