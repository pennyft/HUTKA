package com.hutka.backend.booking.event;

import java.time.Instant;
import java.util.UUID;

/** Поездка началась. По ней ставится таймер эскалации просрочки (planned_end_at + 3 часа). */
public record BookingStartedEvent(UUID bookingId, Instant plannedEndAt) {}
