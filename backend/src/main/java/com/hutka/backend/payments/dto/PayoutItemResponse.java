package com.hutka.backend.payments.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/** Строка детализации выплаты (10.6): какая аренда вошла и какая комиссия по ней удержана. amount — сумма поездки. */
public record PayoutItemResponse(UUID bookingId, BigDecimal amount, BigDecimal commission, BigDecimal partnerAmount,
                                 Instant chargedAt) {}
