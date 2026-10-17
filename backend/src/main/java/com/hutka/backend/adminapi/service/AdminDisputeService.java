package com.hutka.backend.adminapi.service;

import com.hutka.backend.adminapi.AdminUserRepository;
import com.hutka.backend.adminapi.dto.AdminDisputeDetailResponse;
import com.hutka.backend.adminapi.dto.AdminDisputeSummary;
import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.dto.ResolveDisputeRequest;
import com.hutka.backend.auth.User;
import com.hutka.backend.booking.Booking;
import com.hutka.backend.booking.BookingRepository;
import com.hutka.backend.booking.enums.BookingStatus;
import com.hutka.backend.car.Car;
import com.hutka.backend.car.CarRepository;
import com.hutka.backend.car.enums.CarStatus;
import com.hutka.backend.disputes.Dispute;
import com.hutka.backend.disputes.DisputeRepository;
import com.hutka.backend.disputes.DisputeRules;
import com.hutka.backend.disputes.enums.DisputeStatus;
import com.hutka.backend.notifications.enums.NotificationType;
import com.hutka.backend.notifications.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Раздел 16.6: очередь споров, карточка, решение и история решений. Спор открывает BookingDisputePort при эскалации
 * просрочки (6.3). Решение принимается под блокировками в порядке бронь → машина → спор (как в BookingService).
 */
@Service
@RequiredArgsConstructor
public class AdminDisputeService {

    private static final int MAX_PAGE_SIZE = 100;

    private final DisputeRepository disputes;
    private final BookingRepository bookings;
    private final CarRepository cars;
    private final AdminUserRepository users;
    private final NotificationService notifications;

    // ---------------------------------------------------------------- очередь и история

    /**
     * status = open (по умолчанию) — очередь: старые споры первыми. status = resolved — история решений: новые первыми.
     */
    @Transactional(readOnly = true)
    public AdminPage<AdminDisputeSummary> list(DisputeStatus status, int page, int size) {
        DisputeStatus effective = status == null ? DisputeStatus.open : status;
        Sort sort = effective == DisputeStatus.open
                ? Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"))
                : Sort.by(Sort.Order.desc("resolvedAt"), Sort.Order.asc("id"));
        List<Dispute> items = disputes.findByStatus(effective,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE), sort));
        long total = disputes.countByStatus(effective);

        Map<UUID, Booking> bookingById = byId(bookings.findAllById(items.stream().map(Dispute::getBookingId).toList()),
                Booking::getId);
        Map<UUID, Car> carById = byId(cars.findAllById(
                bookingById.values().stream().map(Booking::getCarId).distinct().toList()), Car::getId);
        Collection<UUID> userIds = new ArrayList<>();
        bookingById.values().forEach(b -> userIds.add(b.getRenterId()));
        carById.values().forEach(c -> userIds.add(c.getPartnerId()));
        Map<UUID, User> userById = byId(users.findByIdIn(userIds.stream().distinct().toList()), User::getId);

        return new AdminPage<>(total, items.stream().map(d -> {
            Booking b = bookingById.get(d.getBookingId());
            Car c = b == null ? null : carById.get(b.getCarId());
            return new AdminDisputeSummary(d.getId(), d.getBookingId(), d.getStatus(), d.getDecision(), d.getDamageAmount(),
                    d.getCreatedAt(), d.getResolvedAt(),
                    c == null ? null : c.getId(),
                    c == null ? null : c.getMake() + " " + c.getModel(),
                    b == null ? null : name(userById.get(b.getRenterId())),
                    c == null ? null : name(userById.get(c.getPartnerId())),
                    b == null ? null : b.getStatus(),
                    b == null ? null : b.getPlannedEndAt());
        }).toList());
    }

    // ---------------------------------------------------------------- карточка

    /** Раздел 16.6: фото до/после, стороны, машина, ход событий. Фото грузятся внутри транзакции (open-in-view выключен). */
    @Transactional(readOnly = true)
    public AdminDisputeDetailResponse get(UUID disputeId) {
        Dispute dispute = disputes.findById(disputeId).orElseThrow(AdminDisputeService::disputeNotFound);
        Booking booking = bookings.findById(dispute.getBookingId())
                .orElseThrow(() -> new IllegalStateException("Бронь спора " + disputeId + " не найдена"));
        Car car = cars.findById(booking.getCarId())
                .orElseThrow(() -> new IllegalStateException("Машина брони " + booking.getId() + " не найдена"));
        Map<UUID, User> userById = byId(users.findByIdIn(List.of(booking.getRenterId(), car.getPartnerId())), User::getId);

        return new AdminDisputeDetailResponse(dispute.getId(), dispute.getStatus(), dispute.getDecision(),
                dispute.getDamageAmount(), dispute.getCreatedAt(), dispute.getResolvedAt(), dispute.getResolvedByAdminId(),
                party(booking.getRenterId(), userById.get(booking.getRenterId())),
                party(car.getPartnerId(), userById.get(car.getPartnerId())),
                new AdminDisputeDetailResponse.CarInfo(car.getId(), car.getMake(), car.getModel(), car.getPlateNumber(),
                        car.getStatus()),
                new AdminDisputeDetailResponse.BookingInfo(booking.getId(), booking.getStatus(),
                        booking.getPlannedStartAt(), booking.getPlannedEndAt(), booking.getActualStartAt(),
                        booking.getActualEndAt(), booking.getEscalatedAt(),
                        List.copyOf(booking.getPhotosBefore()), List.copyOf(booking.getPhotosAfter()),
                        booking.getPricePerHour(), booking.getPriceEstimate(), booking.getFinalPrice(),
                        booking.getDiscountAmount(), booking.getOverdueHours(), booking.getDeclineReason()),
                timeline(dispute, booking));
    }

    // ---------------------------------------------------------------- решение

    /**
     * Раздел 16.6, 22.2: фиксирует вердикт (в чью пользу, признанная сумма ущерба) и возвращает машину из under_review
     * в оборот независимо от исхода. Реальное удержание средств — после подключения платежей (раздел 15), сейчас
     * решение хранится как вердикт. Обе стороны получают уведомление dispute_resolved.
     *
     * Статус брони не меняется: если арендатор ещё не вернул машину, он по-прежнему может завершить поездку обычным finish.
     */
    @Transactional
    public AdminDisputeDetailResponse resolve(UUID adminId, UUID disputeId, ResolveDisputeRequest request) {
        BigDecimal damage;
        try {
            damage = DisputeRules.normalizeDamage(request.decision(), request.damageAmount());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }

        UUID bookingId = disputes.findBookingIdById(disputeId).orElseThrow(AdminDisputeService::disputeNotFound);
        Booking booking = bookings.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new IllegalStateException("Бронь спора " + disputeId + " не найдена"));
        Car car = cars.findByIdForUpdate(booking.getCarId())
                .orElseThrow(() -> new IllegalStateException("Машина брони " + bookingId + " не найдена"));
        Dispute dispute = disputes.findByIdForUpdate(disputeId).orElseThrow(AdminDisputeService::disputeNotFound);
        if (dispute.getStatus() != DisputeStatus.open) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Спор уже решён");
        }

        dispute.setStatus(DisputeStatus.resolved);
        dispute.setDecision(request.decision());
        dispute.setDamageAmount(damage);
        dispute.setResolvedAt(Instant.now());
        dispute.setResolvedByAdminId(adminId);

        // 22.2: under_review → available. Как и в BookingService.finish, если на машину есть другая ожидающая бронь,
        // она снова reserved: начать поездку можно только при статусе reserved.
        if (car.getStatus() == CarStatus.under_review && booking.getStatus() != BookingStatus.active) {
            boolean hasOtherPending = bookings.existsByCarIdAndStatusAndIdNot(car.getId(), BookingStatus.pending, booking.getId());
            car.setStatus(hasOtherPending ? CarStatus.reserved : CarStatus.available);
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("disputeId", dispute.getId().toString());
        payload.put("bookingId", booking.getId().toString());
        payload.put("carId", car.getId().toString());
        payload.put("car", car.getMake() + " " + car.getModel());
        payload.put("decision", request.decision().name());
        payload.put("damageAmount", damage.toPlainString());
        notifications.send(booking.getRenterId(), NotificationType.dispute_resolved, payload);
        notifications.send(car.getPartnerId(), NotificationType.dispute_resolved, payload);

        return get(disputeId);
    }

    // ---------------------------------------------------------------- внутреннее

    private static List<AdminDisputeDetailResponse.TimelineEvent> timeline(Dispute dispute, Booking booking) {
        List<AdminDisputeDetailResponse.TimelineEvent> events = new ArrayList<>();
        add(events, "booking_created", booking.getCreatedAt());
        add(events, "booking_confirmed", booking.getConfirmedAt());
        add(events, "trip_started", booking.getActualStartAt());
        add(events, "dispute_opened", dispute.getCreatedAt());
        add(events, "trip_finished", booking.getActualEndAt());
        add(events, "dispute_resolved", dispute.getResolvedAt());
        events.sort(Comparator.comparing(AdminDisputeDetailResponse.TimelineEvent::at));
        return events;
    }

    private static void add(List<AdminDisputeDetailResponse.TimelineEvent> events, String event, Instant at) {
        if (at != null) {
            events.add(new AdminDisputeDetailResponse.TimelineEvent(event, at));
        }
    }

    private static AdminDisputeDetailResponse.Party party(UUID id, User user) {
        return user == null
                ? new AdminDisputeDetailResponse.Party(id, null, null, null)
                : new AdminDisputeDetailResponse.Party(id, name(user), user.getEmail(), user.getPhone());
    }

    private static String name(User user) {
        return user == null ? null : user.getFirstName() + " " + user.getLastName();
    }

    private static <T> Map<UUID, T> byId(Collection<T> items, Function<T, UUID> idOf) {
        return items.stream().filter(Objects::nonNull).collect(Collectors.toMap(idOf, Function.identity()));
    }

    private static ResponseStatusException disputeNotFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Спор не найден");
    }
}
