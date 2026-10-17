package com.hutka.backend.adminapi.dto;

import com.hutka.backend.adminapi.dto.AdminBookingSummary.CarRef;
import com.hutka.backend.adminapi.dto.AdminBookingSummary.Party;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.disputes.enums.DisputeDecision;
import com.hutka.backend.disputes.enums.DisputeStatus;
import com.hutka.backend.payments.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Детальный просмотр брони (16.4): стороны, фото до/после, цена, платёж, спор и лента событий.
 * timeline собирается из временных меток самой брони, отдельной истории статусов в БД нет (см. docs/BACKLOG_DECISIONS.md).
 */
public record AdminBookingDetailResponse(
        UUID id,
        BookingStatus status,
        Party renter,
        CarRef car,
        Party partner,
        Instant plannedStartAt,
        Instant plannedEndAt,
        Instant actualStartAt,
        Instant actualEndAt,
        List<String> photosBefore,
        List<String> photosAfter,
        BigDecimal pricePerHour,
        BigDecimal priceEstimate,
        BigDecimal finalPrice,
        boolean pddDiscountApplied,
        BigDecimal discountAmount,
        BigDecimal overdueHours,
        String declineReason,
        Instant confirmedAt,
        Instant escalatedAt,
        Instant agreementSentAt,
        boolean hasAgreement,
        Instant createdAt,
        PaymentInfo payment,
        DisputeInfo dispute,
        List<TimelineEvent> timeline) {

    public record PaymentInfo(PaymentStatus status, BigDecimal amount, BigDecimal commissionAmount,
                              BigDecimal partnerAmount, String currency) {}

    public record DisputeInfo(UUID id, DisputeStatus status, DisputeDecision decision, BigDecimal damageAmount,
                              Instant createdAt, Instant resolvedAt) {}

    public record TimelineEvent(String event, Instant at) {}
}
