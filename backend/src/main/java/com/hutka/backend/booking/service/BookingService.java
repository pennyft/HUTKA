package com.hutka.backend.booking.service;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.auth.enums.VerificationStatus;
import com.hutka.backend.booking.Booking;
import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.BookingRules;
import com.hutka.backend.booking.BookingSpecifications;
import com.hutka.backend.booking.dto.BookingResponse;
import com.hutka.backend.booking.dto.CreateBookingRequest;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.booking.event.BookingCancelledEvent;
import com.hutka.backend.booking.event.BookingCreatedEvent;
import com.hutka.backend.booking.event.BookingFinishedEvent;
import com.hutka.backend.booking.event.BookingStartedEvent;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.car.enums.BookingMode;
import com.hutka.backend.car.enums.CarStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Раздел 6 и переходы статусов 22.1 / 22.2.
 *
 * Решения, которых нет в Hutka.md дословно (см. также комментарии в коде):
 *  - confirmed_at: статус pending покрывает и «ждёт ответа партнёра», и «подтверждена, ждёт старта» (22.1),
 *    поэтому различие хранится в confirmed_at;
 *  - Car.status хранится один на машину, а броней у неё может быть несколько: после отмены/завершения машина
 *    становится available только если других pending-броней нет, иначе остаётся reserved;
 *  - старт поездки раньше planned_start_at запрещён (таймеры no-show отсчитываются от planned_start_at);
 *  - отмена арендатором — только в статусе pending (раздел 6.4).
 *
 * Таймеры (Quartz) ставятся событиями BookingCreated/Started/Finished — см. BookingTimerListener.
 * Автоматические переходы (автоотклонение, no-show, эскалация) — BookingAutomationService.
 */
@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final CarRepository carRepository;
    private final UserRepository userRepository;
    private final AvailabilityService availabilityService;
    private final PricingService pricingService;
    private final PddDiscountPort pddDiscountPort;
    private final BookingNotifier notifier;
    private final CarReservations carReservations;
    private final PhotoUrlPolicy photoUrlPolicy;
    private final ApplicationEventPublisher eventPublisher;
    private final RenterRatingGate ratingGate;
    private final DisputePort disputePort;

    // ---------------------------------------------------------------- создание (6.1)

    @Transactional
    public BookingResponse create(UUID renterId, CreateBookingRequest request) {
        requireVerified(renterId);
        // Раздел 7.1: рейтинг ниже порога при достаточном числе оценок — бронирование недоступно
        if (ratingGate.isBookingBlocked(renterId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Бронирование недоступно: рейтинг ниже допустимого. Вы можете обратиться в поддержку");
        }

        Car car = lockCar(request.carId());
        if (car.getPartnerId().equals(renterId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Нельзя бронировать собственную машину");
        }
        Instant now = Instant.now();
        availabilityService.assertCanBook(car, request.plannedStartAt(), request.plannedEndAt(), now);

        BigDecimal estimate = pricingService.estimate(request.plannedStartAt(), request.plannedEndAt(), car.getPricePerHour());
        if (estimate.compareTo(BookingRules.MAX_AMOUNT) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Слишком длительная аренда");
        }

        boolean instant = car.getBookingMode() == BookingMode.instant;
        Booking booking = Booking.builder()
                .renterId(renterId)
                .carId(car.getId())
                .plannedStartAt(request.plannedStartAt())
                .plannedEndAt(request.plannedEndAt())
                .pricePerHour(car.getPricePerHour())
                .priceEstimate(estimate)
                .confirmedAt(instant ? now : null)
                .build();
        booking = bookingRepository.save(booking);

        // Раздел 22.2: available → reserved при создании брони. Если машина уже in_trip/reserved по другой брони — статус не трогаем.
        if (car.getStatus() == CarStatus.available) {
            car.setStatus(CarStatus.reserved);
        }

        notifier.bookingCreated(booking, car);
        eventPublisher.publishEvent(new BookingCreatedEvent(
                booking.getId(), booking.getCreatedAt(), booking.getPlannedStartAt(), !instant));
        return toResponse(booking);
    }

    // ---------------------------------------------------------------- ответ партнёра (6.1, 10.4)

    @Transactional
    public BookingResponse approve(UUID partnerId, UUID bookingId) {
        Booking booking = lockBooking(bookingId);
        Car car = lockCar(booking.getCarId());
        requireCarOwner(car, partnerId);
        requireAwaitingPartnerResponse(booking);

        booking.setConfirmedAt(Instant.now());
        notifier.statusChanged(booking, car);
        return toResponse(booking);
    }

    @Transactional
    public BookingResponse decline(UUID partnerId, UUID bookingId, String reason) {
        Booking booking = lockBooking(bookingId);
        Car car = lockCar(booking.getCarId());
        requireCarOwner(car, partnerId);
        requireAwaitingPartnerResponse(booking);

        booking.setStatus(BookingStatus.cancelled);
        booking.setDeclineReason(reason);
        carReservations.releaseIfNoOtherPending(car, booking);
        notifier.statusChanged(booking, car);
        eventPublisher.publishEvent(new BookingCancelledEvent(booking.getId()));
        return toResponse(booking);
    }

    // ---------------------------------------------------------------- начало и завершение (6.2, 6.3)

    @Transactional
    public BookingResponse start(UUID renterId, UUID bookingId, List<String> photosBefore) {
        photoUrlPolicy.validate(photosBefore);
        Booking booking = lockBooking(bookingId);
        requireRenter(booking, renterId);
        Car car = lockCar(booking.getCarId());

        if (booking.getStatus() != BookingStatus.pending) {
            throw conflict("Поездку можно начать только по ожидающей брони");
        }
        if (booking.getConfirmedAt() == null) {
            throw conflict("Партнёр ещё не подтвердил бронь");
        }
        Instant now = Instant.now();
        if (now.isBefore(booking.getPlannedStartAt())) {
            throw conflict("Поездку можно начать не раньше запланированного времени");
        }
        if (car.getStatus() != CarStatus.reserved) {
            throw conflict("Машина сейчас недоступна для начала поездки");
        }

        booking.setPhotosBefore(new ArrayList<>(photosBefore));
        booking.setActualStartAt(now);
        booking.setStatus(BookingStatus.active);
        car.setStatus(CarStatus.in_trip); // 22.2: reserved → in_trip, когда загружено фото «до»

        notifier.statusChanged(booking, car);
        eventPublisher.publishEvent(new BookingStartedEvent(booking.getId(), booking.getPlannedEndAt()));
        return toResponse(booking);
    }

    @Transactional
    public BookingResponse finish(UUID renterId, UUID bookingId, List<String> photosAfter) {
        photoUrlPolicy.validate(photosAfter);
        Booking booking = lockBooking(bookingId);
        requireRenter(booking, renterId);
        Car car = lockCar(booking.getCarId());

        if (booking.getStatus() != BookingStatus.active) {
            throw conflict("Завершить можно только начатую поездку");
        }

        Instant now = Instant.now();
        boolean discount = pddDiscountPort.consumeDiscount(renterId, booking.getId(), booking.getCreatedAt());
        PricingService.PriceBreakdown price = pricingService.calculateFinal(
                booking.getActualStartAt(), now, booking.getPlannedEndAt(), booking.getPricePerHour(), discount);

        booking.setPhotosAfter(new ArrayList<>(photosAfter));
        booking.setActualEndAt(now);
        booking.setOverdueHours(price.overdueHours());
        booking.setPddDiscountApplied(discount);
        booking.setDiscountAmount(price.discountAmount());
        booking.setFinalPrice(price.finalPrice());
        booking.setStatus(BookingStatus.finished);

        boolean carInTrip = car.getStatus() == CarStatus.in_trip;
        boolean carHeldBySettledDispute = car.getStatus() == CarStatus.under_review
                && booking.getEscalatedAt() != null
                && !disputePort.hasOpenDispute(booking.getId());
        if (carInTrip || carHeldBySettledDispute) {
            boolean hasOtherPending = bookingRepository
                    .existsByCarIdAndStatusAndIdNot(car.getId(), BookingStatus.pending, booking.getId());
            car.setStatus(hasOtherPending ? CarStatus.reserved : CarStatus.available);
        }

        notifier.statusChanged(booking, car);
        eventPublisher.publishEvent(new BookingFinishedEvent(booking.getId()));
        return toResponse(booking);
    }

    // ---------------------------------------------------------------- отмена (6.4)

    @Transactional
    public BookingResponse cancel(UUID renterId, UUID bookingId) {
        Booking booking = lockBooking(bookingId);
        requireRenter(booking, renterId);
        Car car = lockCar(booking.getCarId());

        if (booking.getStatus() != BookingStatus.pending) {
            throw conflict("Отменить можно только бронь, поездка по которой ещё не начата");
        }

        booking.setStatus(BookingStatus.cancelled);
        carReservations.releaseIfNoOtherPending(car, booking);
        notifier.statusChanged(booking, car);
        eventPublisher.publishEvent(new BookingCancelledEvent(booking.getId()));
        return toResponse(booking);
    }

    // ---------------------------------------------------------------- чтение

    @Transactional(readOnly = true)
    public List<BookingResponse> findForRenter(UUID renterId, BookingStatus status) {
        Specification<Booking> spec = BookingSpecifications.renter(renterId)
                .and(BookingSpecifications.status(status));
        return bookingRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream().map(this::toResponse).toList();
    }

    /** Раздел 10.4: входящие брони по всем машинам партнёра с фильтрами по статусу, машине, дате. */
    @Transactional(readOnly = true)
    public List<BookingResponse> findForPartner(UUID partnerId, BookingStatus status, UUID carId, Instant from, Instant to) {
        List<UUID> carIds = carRepository.findIdsByPartnerId(partnerId);
        if (carIds.isEmpty()) {
            return List.of();
        }
        Specification<Booking> spec = BookingSpecifications.carIn(carIds)
                .and(BookingSpecifications.status(status))
                .and(BookingSpecifications.car(carId))
                .and(BookingSpecifications.plannedStartFrom(from))
                .and(BookingSpecifications.plannedStartBefore(to));
        return bookingRepository.findAll(spec, Sort.by(Sort.Direction.DESC, "plannedStartAt"))
                .stream().map(this::toResponse).toList();
    }

    /** Бронь видят арендатор и партнёр машины; для остальных она «не существует» (404, а не 403 — как в CarService). */
    @Transactional(readOnly = true)
    public BookingResponse findById(UUID userId, UUID bookingId) {
        Booking booking = bookingRepository.findById(bookingId).orElseThrow(BookingService::bookingNotFound);
        if (!booking.getRenterId().equals(userId)) {
            Car car = carRepository.findById(booking.getCarId()).orElseThrow(BookingService::bookingNotFound);
            if (!car.getPartnerId().equals(userId)) {
                throw bookingNotFound();
            }
        }
        return toResponse(booking);
    }

    // ---------------------------------------------------------------- внутреннее

    /** Раздел 2: бронирование доступно только verified-пользователю. */
    private void requireVerified(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
        if (user.getVerificationStatus() != VerificationStatus.verified) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Бронирование доступно после подтверждения водительского удостоверения");
        }
    }

    /** Заявка ждёт ответа: бронь pending, ещё не подтверждена и не вышли 6 часов (раздел 6.1). */
    private void requireAwaitingPartnerResponse(Booking booking) {
        if (booking.getStatus() != BookingStatus.pending || booking.getConfirmedAt() != null) {
            throw conflict("Заявка уже обработана");
        }
        if (Instant.now().isAfter(booking.getCreatedAt().plus(BookingRules.REQUEST_TO_BOOK_RESPONSE_TIMEOUT))) {
            throw conflict("Время ответа на заявку истекло");
        }
    }

    @Transactional
    public BookingResponse forceCloseByAdmin(UUID bookingId) {
        Booking booking = lockBooking(bookingId);
        Car car = lockCar(booking.getCarId());

        if (booking.getStatus() != BookingStatus.active) {
            throw conflict("Принудительно закрыть можно только начатую поездку");
        }
        if (booking.getEscalatedAt() == null) {
            throw conflict("Бронь не была передана в спор");
        }
        if (disputePort.hasOpenDispute(booking.getId())) {
            throw conflict("Сначала нужно решить спор по этой брони");
        }

        Instant end = booking.getEscalatedAt();
        PricingService.PriceBreakdown price = pricingService.calculateFinal(
                booking.getActualStartAt(), end, booking.getPlannedEndAt(), booking.getPricePerHour(), false);

        booking.setActualEndAt(end);
        booking.setOverdueHours(price.overdueHours());
        booking.setPddDiscountApplied(false);
        booking.setDiscountAmount(price.discountAmount());
        booking.setFinalPrice(price.finalPrice());
        booking.setStatus(BookingStatus.finished);

        if (car.getStatus() == CarStatus.under_review) {
            boolean hasOtherPending = bookingRepository
                    .existsByCarIdAndStatusAndIdNot(car.getId(), BookingStatus.pending, booking.getId());
            car.setStatus(hasOtherPending ? CarStatus.reserved : CarStatus.available);
        }

        notifier.statusChanged(booking, car);
        eventPublisher.publishEvent(new BookingFinishedEvent(booking.getId()));
        return toResponse(booking);
    }

    private Booking lockBooking(UUID bookingId) {
        return bookingRepository.findByIdForUpdate(bookingId).orElseThrow(BookingService::bookingNotFound);
    }

    private Car lockCar(UUID carId) {
        return carRepository.findByIdForUpdate(carId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Машина не найдена"));
    }

    private void requireRenter(Booking booking, UUID renterId) {
        if (!booking.getRenterId().equals(renterId)) {
            throw bookingNotFound();
        }
    }

    private void requireCarOwner(Car car, UUID partnerId) {
        if (!car.getPartnerId().equals(partnerId)) {
            throw bookingNotFound();
        }
    }

    private BookingResponse toResponse(Booking b) {
        return new BookingResponse(
                b.getId(), b.getRenterId(), b.getCarId(), b.getStatus(),
                b.getPlannedStartAt(), b.getPlannedEndAt(), b.getActualStartAt(), b.getActualEndAt(),
                List.copyOf(b.getPhotosBefore()), List.copyOf(b.getPhotosAfter()),
                b.getPricePerHour(), b.getPriceEstimate(), b.getFinalPrice(),
                b.isPddDiscountApplied(), b.getDiscountAmount(), b.getOverdueHours(),
                b.getConfirmedAt(), b.getDeclineReason(), b.getCreatedAt());
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }

    private static ResponseStatusException bookingNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Бронирование не найдено");
    }
}
