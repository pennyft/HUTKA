package com.hutka.backend.adminapi.service;

import com.hutka.backend.adminapi.AdminDisputeLookupRepository;
import com.hutka.backend.adminapi.AdminUserRepository;
import com.hutka.backend.adminapi.dto.AdminBookingDetailResponse;
import com.hutka.backend.adminapi.dto.AdminBookingDetailResponse.DisputeInfo;
import com.hutka.backend.adminapi.dto.AdminBookingDetailResponse.PaymentInfo;
import com.hutka.backend.adminapi.dto.AdminBookingDetailResponse.TimelineEvent;
import com.hutka.backend.adminapi.dto.AdminBookingSummary;
import com.hutka.backend.adminapi.dto.AdminBookingSummary.CarRef;
import com.hutka.backend.adminapi.dto.AdminBookingSummary.Party;
import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.auth.User;
import com.hutka.backend.booking.Booking;
import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.BookingSpecifications;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.disputes.Dispute;
import com.hutka.backend.payments.Payment;
import com.hutka.backend.payments.PaymentRepository;
import com.hutka.backend.payments.enums.PaymentKind;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import com.hutka.backend.booking.service.BookingService;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Раздел 16.4: просмотр всех бронирований платформы — только чтение. Фильтры: статус, машина, арендатор, «пользователь»
 * (арендатор ИЛИ владелец машины), диапазон по началу поездки по плану. Вмешательство в бронь идёт через споры (16.6).
 */
@Service
@RequiredArgsConstructor
public class AdminBookingService {

    private static final int MAX_PAGE_SIZE = 100;

    private final BookingRepository bookings;
    private final CarRepository cars;
    private final AdminUserRepository users;
    private final PaymentRepository payments;
    private final AdminDisputeLookupRepository disputes;
    private final BookingService bookingService;

    @Transactional(readOnly = true)
    public AdminPage<AdminBookingSummary> list(BookingStatus status, UUID carId, UUID renterId, UUID userId,
                                               Instant from, Instant to, int page, int size) {
        Specification<Booking> spec = BookingSpecifications.status(status)
                .and(BookingSpecifications.car(carId))
                .and(BookingSpecifications.plannedStartFrom(from))
                .and(BookingSpecifications.plannedStartBefore(to));
        if (renterId != null) {
            spec = spec.and(BookingSpecifications.renter(renterId));
        }
        if (userId != null) {
            Specification<Booking> involved = BookingSpecifications.renter(userId);
            List<UUID> owned = cars.findIdsByPartnerId(userId);
            if (!owned.isEmpty()) {
                involved = involved.or(BookingSpecifications.carIn(owned));
            }
            spec = spec.and(involved);
        }
        Page<Booking> result = bookings.findAll(spec, PageRequest.of(Math.max(page, 0),
                Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"))));

        Map<UUID, Car> carsById = cars.findAllById(result.getContent().stream().map(Booking::getCarId).distinct().toList())
                .stream().collect(Collectors.toMap(Car::getId, Function.identity()));
        Set<UUID> userIds = new HashSet<>();
        result.getContent().forEach(b -> {
            userIds.add(b.getRenterId());
            Car car = carsById.get(b.getCarId());
            if (car != null) userIds.add(car.getPartnerId());
        });
        Map<UUID, User> usersById = users.findByIdIn(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        return new AdminPage<>(result.getTotalElements(), result.getContent().stream()
                .map(b -> summary(b, carsById.get(b.getCarId()), usersById))
                .toList());
    }

    @Transactional(readOnly = true)
    public AdminBookingDetailResponse get(UUID bookingId) {
        Booking b = bookings.findById(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Бронирование не найдено"));
        Car car = cars.findById(b.getCarId()).orElse(null);
        Set<UUID> userIds = new HashSet<>();
        userIds.add(b.getRenterId());
        if (car != null) userIds.add(car.getPartnerId());
        Map<UUID, User> usersById = users.findByIdIn(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        Payment payment = payments.findByBookingIdAndKind(bookingId, PaymentKind.trip_charge).orElse(null);
        Dispute dispute = disputes.findByBookingId(bookingId).orElse(null);
        AdminBookingSummary s = summary(b, car, usersById);

        return new AdminBookingDetailResponse(b.getId(), b.getStatus(), s.renter(), s.car(), s.partner(),
                b.getPlannedStartAt(), b.getPlannedEndAt(), b.getActualStartAt(), b.getActualEndAt(),
                List.copyOf(b.getPhotosBefore()), List.copyOf(b.getPhotosAfter()),
                b.getPricePerHour(), b.getPriceEstimate(), b.getFinalPrice(), b.isPddDiscountApplied(),
                b.getDiscountAmount(), b.getOverdueHours(), b.getDeclineReason(), b.getConfirmedAt(),
                b.getEscalatedAt(), b.getAgreementSentAt(), b.getAgreementPdfUrl() != null, b.getCreatedAt(),
                payment == null ? null : new PaymentInfo(payment.getStatus(), payment.getAmount(),
                        payment.getCommissionAmount(), payment.getPartnerAmount(), payment.getCurrency()),
                dispute == null ? null : new DisputeInfo(dispute.getId(), dispute.getStatus(), dispute.getDecision(),
                        dispute.getDamageAmount(), dispute.getCreatedAt(), dispute.getResolvedAt()),
                timeline(b, payment, dispute));
    }

    /** События с известным временем, по возрастанию. Момент отмены в БД не хранится — отмена видна по status. */
    private static List<TimelineEvent> timeline(Booking b, Payment payment, Dispute dispute) {
        List<TimelineEvent> events = new ArrayList<>();
        add(events, "created", b.getCreatedAt());
        add(events, "confirmed", b.getConfirmedAt());
        add(events, "trip_started", b.getActualStartAt());
        add(events, "overdue_escalated", b.getEscalatedAt());
        add(events, "trip_finished", b.getActualEndAt());
        add(events, "agreement_sent", b.getAgreementSentAt());
        if (payment != null) add(events, "payment_created", payment.getCreatedAt());
        if (dispute != null) {
            add(events, "dispute_opened", dispute.getCreatedAt());
            add(events, "dispute_resolved", dispute.getResolvedAt());
        }
        events.sort(Comparator.comparing(TimelineEvent::at));
        return events;
    }

    private static void add(List<TimelineEvent> events, String event, Instant at) {
        if (at != null) events.add(new TimelineEvent(event, at));
    }

    private static AdminBookingSummary summary(Booking b, Car car, Map<UUID, User> usersById) {
        return new AdminBookingSummary(b.getId(), b.getStatus(), party(usersById.get(b.getRenterId()), b.getRenterId()),
                car == null ? new CarRef(b.getCarId(), null, null)
                        : new CarRef(car.getId(), car.getMake() + " " + car.getModel(), car.getPlateNumber()),
                car == null ? null : party(usersById.get(car.getPartnerId()), car.getPartnerId()),
                b.getPlannedStartAt(), b.getPlannedEndAt(), b.getActualStartAt(), b.getActualEndAt(),
                b.getPriceEstimate(), b.getFinalPrice(), b.getEscalatedAt() != null, b.getCreatedAt());
    }

    private static Party party(User u, UUID id) {
        return u == null ? new Party(id, null, null, null)
                : new Party(u.getId(), u.getFirstName() + " " + u.getLastName(), u.getEmail(), u.getPhone());
    }

    public AdminBookingDetailResponse forceClose(UUID bookingId) {
        bookingService.forceCloseByAdmin(bookingId);
        return get(bookingId);
    }
}
