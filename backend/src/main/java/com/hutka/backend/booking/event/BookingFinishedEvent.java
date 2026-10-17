package com.hutka.backend.booking.event;

import java.util.UUID;

/**
 * Публикуется при завершении поездки (раздел 6.3). По нему ставится джоб генерации и отправки PDF-договора (6.6).
 * Слушатель синхронный и работает в той же транзакции, что и finish: джоб в Quartz появляется атомарно с завершением брони.
 */
public record BookingFinishedEvent(UUID bookingId) {}
