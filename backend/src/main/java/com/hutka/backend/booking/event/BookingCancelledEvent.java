package com.hutka.backend.booking.event;

import java.util.UUID;

/**
 * Бронь отменена арендатором или отклонена партнёром (не автоотмена): таймеры по ней больше не нужны.
 * Автоотмены сюда не попадают намеренно — их выполняет сам Quartz-джоб, и удалять его задачу изнутри не нужно.
 */
public record BookingCancelledEvent(UUID bookingId) {}
