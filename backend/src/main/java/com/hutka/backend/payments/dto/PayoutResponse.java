package com.hutka.backend.payments.dto;

import com.hutka.backend.payments.enums.PayoutStatus;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Выплата (10.6, 21.4). amount — сумма партнёру за вычетом комиссии; commissionDeducted — удержанная комиссия. */
public record PayoutResponse(UUID id, UUID partnerId, LocalDate periodStart, LocalDate periodEnd, BigDecimal amount,
                             BigDecimal commissionDeducted, String currency, PayoutStatus status, Instant paidAt,
                             Instant createdAt) {}
