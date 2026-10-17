package com.hutka.backend.weather;

import com.hutka.backend.booking.event.BookingCancelledEvent;
import com.hutka.backend.booking.event.BookingCreatedEvent;
import com.hutka.backend.booking.event.BookingStartedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

/**
 * Связывает бронирования с погодными проверками (12, 17.2), не меняя пакет booking: слушает его события.
 * Срабатывает ПОСЛЕ коммита брони, в отличие от BookingTimerListener: сбой планирования погодной проверки не должен
 * откатывать бронирование — таймеры брони критичны, погода нет. Отказ только логируется; если задача всё же не снята,
 * WeatherCheckService увидит, что бронь уже не pending, и пропустит проверку.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WeatherCheckListener {

    private final WeatherJobScheduler jobScheduler;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onCreated(BookingCreatedEvent event) {
        try {
            WeatherRules.Plan plan = WeatherRules.plan(event.createdAt(), event.plannedStartAt());
            jobScheduler.schedule(event.bookingId(), plan.kind(), plan.at(), 0);
        } catch (RuntimeException e) {
            log.error("Погода по брони {}: проверку запланировать не удалось: {}", event.bookingId(), e.getMessage());
        }
    }

    /** Поездка начата — предупреждать о погоде на её время уже поздно. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onStarted(BookingStartedEvent event) {
        cancel(event.bookingId());
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onCancelled(BookingCancelledEvent event) {
        cancel(event.bookingId());
    }

    private void cancel(UUID bookingId) {
        try {
            jobScheduler.cancel(bookingId);
        } catch (RuntimeException e) {
            log.error("Погода по брони {}: проверку снять не удалось: {}", bookingId, e.getMessage());
        }
    }
}
