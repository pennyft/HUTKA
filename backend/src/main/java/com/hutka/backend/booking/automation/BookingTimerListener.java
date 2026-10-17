package com.hutka.backend.booking.automation;

import com.hutka.backend.booking.BookingRules;
import com.hutka.backend.booking.event.BookingCancelledEvent;
import com.hutka.backend.booking.event.BookingCreatedEvent;
import com.hutka.backend.booking.event.BookingFinishedEvent;
import com.hutka.backend.booking.event.BookingStartedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Превращает события брони в таймеры Quartz (раздел 17.2). Слушатели синхронные — работают в транзакции
 * публикующего сервиса (см. BookingJobScheduler). Если постановка задачи упадёт, откатится и сама операция.
 */
@Component
@RequiredArgsConstructor
public class BookingTimerListener {

    private final BookingJobScheduler jobScheduler;

    @EventListener
    public void onCreated(BookingCreatedEvent event) {
        jobScheduler.scheduleStartTimeout(event.bookingId(),
                event.plannedStartAt().plus(BookingRules.NO_SHOW_TIMEOUT));
        if (event.awaitingPartnerResponse()) {
            jobScheduler.scheduleRequestTimeout(event.bookingId(),
                    event.createdAt().plus(BookingRules.REQUEST_TO_BOOK_RESPONSE_TIMEOUT));
        }
    }

    @EventListener
    public void onStarted(BookingStartedEvent event) {
        jobScheduler.scheduleOverdueEscalation(event.bookingId(),
                event.plannedEndAt().plus(BookingRules.OVERDUE_ESCALATION_AFTER));
    }

    @EventListener
    public void onFinished(BookingFinishedEvent event) {
        // Поездка завершена: таймеры no-show и эскалации просрочки больше не нужны.
        jobScheduler.cancelTimers(event.bookingId());
        jobScheduler.scheduleAgreement(event.bookingId(), Instant.now(), 0);
    }

    @EventListener
    public void onCancelled(BookingCancelledEvent event) {
        jobScheduler.cancelTimers(event.bookingId());
    }
}
