package com.hutka.backend.booking.automation;

import com.hutka.backend.booking.Booking;
import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.BookingRules;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.booking.service.BookingNotifier;
import com.hutka.backend.booking.service.CarReservations;
import com.hutka.backend.booking.service.DisputePort;
import com.hutka.backend.booking.strike.PartnerStrikeService;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.car.enums.CarStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/**
 * Автоматические переходы брони по таймерам (17.2). Все методы идемпотентны: берут блокировку брони
 * (порядок блокировок тот же, что в BookingService: сначала бронь, потом машина), заново проверяют
 * состояние и срок и молча выходят, если делать уже нечего. Поэтому один и тот же переход безопасно
 * запускать и из Quartz-джоба, и из sweeper, и повторно после сбоя.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingAutomationService {

    private final BookingRepository bookingRepository;
    private final CarRepository carRepository;
    private final CarReservations carReservations;
    private final PartnerStrikeService strikeService;
    private final BookingNotifier notifier;
    private final DisputePort disputePort;

    /** Раздел 6.1: Request to Book — партнёр не ответил за 6 часов, заявка отклоняется. */
    @Transactional
    public void expireRequest(UUID bookingId) {
        Booking booking = lock(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.pending || booking.getConfirmedAt() != null) {
            return;
        }
        if (Instant.now().isBefore(booking.getCreatedAt().plus(BookingRules.REQUEST_TO_BOOK_RESPONSE_TIMEOUT))) {
            return;
        }
        cancelUnanswered(booking);
    }

    /**
     * Разделы 6.1 и 6.5: поездка не начата через 1 час после planned_start_at.
     *  - заявка так и не подтверждена партнёром — то же, что истечение 6 часов (без страйка);
     *  - машина недоступна (in_trip по другой брони или under_review), и причина не в просрочке предыдущего
     *    арендатора — неявка партнёра: страйк;
     *  - машина недоступна, потому что предыдущий арендатор не вернул её вовремя — отмена без страйка
     *    и без последствий для партнёра и арендатора (баг B3);
     *  - иначе — неявка арендатора.
     */
    @Transactional
    public void cancelOnStartTimeout(UUID bookingId) {
        Booking booking = lock(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.pending) {
            return;
        }
        if (Instant.now().isBefore(booking.getPlannedStartAt().plus(BookingRules.NO_SHOW_TIMEOUT))) {
            return;
        }
        if (booking.getConfirmedAt() == null) {
            cancelUnanswered(booking);
            return;
        }

        Car car = lockCar(booking.getCarId());
        boolean carUnavailable = car.getStatus() == CarStatus.in_trip || car.getStatus() == CarStatus.under_review;

        booking.setStatus(BookingStatus.cancelled);
        if (carUnavailable && blockedByOverdueRenter(booking, car)) {
            // Машину не вернул предыдущий арендатор — партнёр не виноват, страйк не начисляется.
            booking.setDeclineReason("Автоотмена: машина не возвращена предыдущим арендатором");
            carReservations.releaseIfNoOtherPending(car, booking);
            notifier.statusChanged(booking, car);
            log.info("Бронь {} автоматически отменена: машина занята просрочившим арендатором, страйк не начислен", bookingId);
            return;
        }
        if (carUnavailable) {
            booking.setDeclineReason("Автоотмена: машина недоступна к началу поездки (неявка партнёра)");
            carReservations.releaseIfNoOtherPending(car, booking);
            PartnerStrikeService.StrikeResult strike = strikeService.record(booking, car);
            notifier.partnerNoShow(booking, car, strike.strikesInWindow(), strike.carHidden());
        } else {
            booking.setDeclineReason("Автоотмена: поездка не начата в течение часа после запланированного времени (неявка арендатора)");
            carReservations.releaseIfNoOtherPending(car, booking);
            notifier.renterNoShow(booking, car);
        }
        log.info("Бронь {} автоматически отменена (неявка {})", bookingId, carUnavailable ? "партнёра" : "арендатора");
    }

    /**
     * Раздел 6.3: просрочка возврата больше 3 часов — эскалация в «Споры», машина in_trip → under_review.
     * Бронь остаётся active: когда арендатор вернёт машину и нажмёт finish, статус машины остаётся under_review
     * до решения администратора (22.2). Закрытие спора — задача пакета disputes.
     */
    @Transactional
    public void escalateOverdue(UUID bookingId) {
        Booking booking = lock(bookingId).orElse(null);
        if (booking == null || booking.getStatus() != BookingStatus.active || booking.getEscalatedAt() != null) {
            return;
        }
        if (Instant.now().isBefore(booking.getPlannedEndAt().plus(BookingRules.OVERDUE_ESCALATION_AFTER))) {
            return;
        }

        Car car = lockCar(booking.getCarId());
        if (car.getStatus() == CarStatus.in_trip) {
            car.setStatus(CarStatus.under_review);
        }
        booking.setEscalatedAt(Instant.now());
        disputePort.openOverdueDispute(booking, car);
        notifier.overdueEscalated(booking, car);
        log.info("Бронь {}: просрочка эскалирована в споры", bookingId);
    }

    // ---------------------------------------------------------------- внутреннее

    private void cancelUnanswered(Booking booking) {
        Car car = lockCar(booking.getCarId());
        booking.setStatus(BookingStatus.cancelled);
        booking.setDeclineReason("Автоотклонение: партнёр не ответил на заявку вовремя");
        carReservations.releaseIfNoOtherPending(car, booking);
        notifier.requestExpired(booking, car);
        log.info("Бронь {}: заявка автоматически отклонена", booking.getId());
    }

    /** Баг B3: машина занята бронью, плановый конец которой наступил до начала этой брони, а возврата не было. */
    private boolean blockedByOverdueRenter(Booking booking, Car car) {
        return bookingRepository.existsOverdueBookingBlockingCar(
                car.getId(), booking.getId(), booking.getPlannedStartAt(), BookingStatus.active);
    }

    private Optional<Booking> lock(UUID bookingId) {
        return bookingRepository.findByIdForUpdate(bookingId);
    }

    private Car lockCar(UUID carId) {
        return carRepository.findByIdForUpdate(carId)
                .orElseThrow(() -> new IllegalStateException("Машина " + carId + " не найдена"));
    }
}
