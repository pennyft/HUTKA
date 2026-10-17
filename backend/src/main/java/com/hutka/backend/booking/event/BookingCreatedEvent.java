package com.hutka.backend.booking.event;

import java.time.Instant;
import java.util.UUID;

/** Бронь создана. По ней ставятся таймеры: no-show (всегда) и 6 часов на ответ (если ждёт партнёра). */
public record BookingCreatedEvent(UUID bookingId, Instant createdAt, Instant plannedStartAt,
                                  boolean awaitingPartnerResponse) {}
