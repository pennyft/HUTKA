package com.hutka.backend.grouptrips.service;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import com.hutka.backend.auth.enums.VerificationStatus;
import com.hutka.backend.grouptrips.GroupTrip;
import com.hutka.backend.grouptrips.GroupTripParticipant;
import com.hutka.backend.grouptrips.GroupTripParticipantRepository;
import com.hutka.backend.grouptrips.GroupTripRepository;
import com.hutka.backend.grouptrips.GroupTripRules;
import com.hutka.backend.grouptrips.GroupTripSpecifications;
import com.hutka.backend.grouptrips.dto.CreateGroupTripRequest;
import com.hutka.backend.grouptrips.dto.GroupTripDetailResponse;
import com.hutka.backend.grouptrips.dto.GroupTripListResponse;
import com.hutka.backend.grouptrips.dto.GroupTripResponse;
import com.hutka.backend.grouptrips.dto.ParticipantResponse;
import com.hutka.backend.grouptrips.enums.GroupTripStatus;
import com.hutka.backend.notifications.enums.NotificationType;
import com.hutka.backend.notifications.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Раздел 8 и 23.5: групповые поездки — создание, список, карточка, присоединение, закрытие набора, отмена.
 * Все операции доступны только verified-пользователю (2: «групповые поездки … недоступны до получения статуса verified»).
 * Чат — GroupTripChatService. Решения, которых нет в Hutka.md дословно, — docs/GROUPTRIPS_DECISIONS.md.
 */
@Service
@RequiredArgsConstructor
public class GroupTripService {

    private static final int MAX_PAGE_SIZE = 100;
    /** В общем списке (не «мои») видны только поездки, к которым ещё можно присматриваться. */
    private static final List<GroupTripStatus> PUBLIC_STATUSES = List.of(GroupTripStatus.open, GroupTripStatus.closed);
    private static final List<GroupTripStatus> ACTIVE = List.of(GroupTripStatus.open, GroupTripStatus.closed);

    private final GroupTripRepository trips;
    private final GroupTripParticipantRepository participants;
    private final UserRepository users;
    private final NotificationService notifications;

    @Value("${app.group-trips.timezone:Europe/Minsk}")
    private String timezone;

    // ---------------------------------------------------------------- POST /group-trips

    @Transactional
    public GroupTripDetailResponse create(UUID userId, CreateGroupTripRequest request) {
        requireVerified(userId);
        LocalDate today = today();
        String route;
        try {
            route = GroupTripRules.normalize(request.route(), GroupTripRules.ROUTE_MAX, "Маршрут");
            GroupTripRules.validateMaxParticipants(request.maxParticipants());
            GroupTripRules.validateDate(request.date(), today);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        Instant now = Instant.now();
        GroupTrip trip = trips.save(GroupTrip.builder()
                .organizerId(userId)
                .route(route)
                .maxParticipants(request.maxParticipants())
                .tripDate(request.date())
                .status(GroupTripStatus.open)
                .createdAt(now)
                .updatedAt(now)
                .build());
        participants.save(GroupTripParticipant.builder().tripId(trip.getId()).userId(userId).joinedAt(now).build());
        return detail(trip, userId, today);
    }

    // ---------------------------------------------------------------- GET /group-trips

    /**
     * mine = false (по умолчанию) — общий список: открытые и закрытые для набора поездки от сегодняшнего дня, ближайшие первыми
     * (закрытые остаются в списке, но присоединиться к ним нельзя — 8). mine = true — все поездки пользователя
     * (организатор или участник) в любом статусе, включая завершённые и отменённые, свежие первыми.
     * status — необязательный фильтр; в общем списке допустимы только open и closed.
     */
    @Transactional(readOnly = true)
    public GroupTripListResponse list(UUID userId, boolean mine, GroupTripStatus status, int page, int size) {
        requireVerified(userId);
        LocalDate today = today();

        Specification<GroupTrip> spec;
        Sort sort;
        if (mine) {
            spec = GroupTripSpecifications.participant(userId).and(GroupTripSpecifications.status(status));
            sort = Sort.by(Sort.Order.desc("tripDate"), Sort.Order.desc("createdAt"), Sort.Order.asc("id"));
        } else {
            if (status != null && !PUBLIC_STATUSES.contains(status)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "В общем списке доступны только статусы open и closed; свои поездки — mine=true");
            }
            spec = GroupTripSpecifications.statusIn(status == null ? PUBLIC_STATUSES : List.of(status))
                    .and(GroupTripSpecifications.dateFrom(today));
            sort = Sort.by(Sort.Order.asc("tripDate"), Sort.Order.asc("createdAt"), Sort.Order.asc("id"));
        }
        Page<GroupTrip> result = trips.findAll(spec,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE), sort));

        List<GroupTrip> items = result.getContent();
        List<UUID> ids = items.stream().map(GroupTrip::getId).toList();
        Map<UUID, Long> counts = ids.isEmpty() ? Map.of()
                : participants.countByTripIds(ids).stream()
                        .collect(Collectors.toMap(GroupTripParticipantRepository.TripCount::getTripId,
                                GroupTripParticipantRepository.TripCount::getTotal));
        Set<UUID> joined = ids.isEmpty() ? Set.of()
                : participants.findByUserIdAndTripIdIn(userId, ids).stream()
                        .map(GroupTripParticipant::getTripId).collect(Collectors.toSet());
        Map<UUID, User> organizers = userMap(items.stream().map(GroupTrip::getOrganizerId).toList());

        return new GroupTripListResponse(result.getTotalElements(), items.stream().map(t -> {
            long count = counts.getOrDefault(t.getId(), 0L);
            User organizer = organizers.get(t.getOrganizerId());
            return new GroupTripResponse(t.getId(), t.getOrganizerId(),
                    organizer == null ? null : GroupTripRules.displayName(organizer.getFirstName(), organizer.getLastName()),
                    t.getRoute(), t.getTripDate(), t.getStatus(), t.getMaxParticipants(), count,
                    count >= t.getMaxParticipants(), joined.contains(t.getId()), t.getCreatedAt());
        }).toList());
    }

    // ---------------------------------------------------------------- GET /group-trips/:id

    /** Открытую и закрытую поездку видит любой verified-пользователь; завершённую и отменённую — только участники (иначе 404). */
    @Transactional(readOnly = true)
    public GroupTripDetailResponse get(UUID userId, UUID tripId) {
        requireVerified(userId);
        GroupTrip trip = trips.findById(tripId).orElseThrow(GroupTripService::notFound);
        boolean member = participants.existsByTripIdAndUserId(tripId, userId);
        if (!member && !ACTIVE.contains(trip.getStatus())) {
            throw notFound();
        }
        return detail(trip, userId, today());
    }

    // ---------------------------------------------------------------- POST /group-trips/:id/join

    /** Присоединение не создаёт бронирование (8): участник бронирует машину отдельно. Организатор получает уведомление. */
    @Transactional
    public GroupTripDetailResponse join(UUID userId, UUID tripId) {
        User user = requireVerified(userId);
        GroupTrip trip = trips.findByIdForUpdate(tripId).orElseThrow(GroupTripService::notFound);
        LocalDate today = today();
        long count = participants.countByTripId(tripId);
        Optional<String> denial = GroupTripRules.joinDenial(trip.getStatus(), trip.getTripDate(), today,
                participants.existsByTripIdAndUserId(tripId, userId), count, trip.getMaxParticipants());
        if (denial.isPresent()) {
            throw conflict(denial.get());
        }
        participants.save(GroupTripParticipant.builder().tripId(tripId).userId(userId).joinedAt(Instant.now()).build());

        Map<String, Object> payload = tripPayload(trip);
        payload.put("participantId", userId.toString());
        payload.put("participantName", GroupTripRules.displayName(user.getFirstName(), user.getLastName()));
        payload.put("participantsCount", count + 1);
        payload.put("maxParticipants", trip.getMaxParticipants());
        notifications.send(trip.getOrganizerId(), NotificationType.group_trip_joined, payload);
        return detail(trip, userId, today);
    }

    // ---------------------------------------------------------------- PATCH /group-trips/:id/close

    /** Организатор закрывает набор: вступившие остаются, поездка остаётся в списке и в чате (8). Участники получают уведомление. */
    @Transactional
    public GroupTripDetailResponse close(UUID userId, UUID tripId) {
        requireVerified(userId);
        GroupTrip trip = organizerTripForUpdate(userId, tripId);
        LocalDate today = today();
        Optional<String> denial = GroupTripRules.closeDenial(trip.getStatus(), trip.getTripDate(), today);
        if (denial.isPresent()) {
            throw conflict(denial.get());
        }
        trip.closeRecruitment(Instant.now());
        notifyParticipants(trip, NotificationType.group_trip_closed);
        return detail(trip, userId, today);
    }

    // ---------------------------------------------------------------- POST /group-trips/:id/cancel

    /**
     * Полная отмена до даты поездки (8): поездка исчезает из общего списка, все участники получают уведомление.
     * Индивидуальные бронирования участников не затрагиваются — каждый отменяет свою бронь сам (6.4).
     */
    @Transactional
    public GroupTripDetailResponse cancel(UUID userId, UUID tripId) {
        requireVerified(userId);
        GroupTrip trip = organizerTripForUpdate(userId, tripId);
        LocalDate today = today();
        Optional<String> denial = GroupTripRules.cancelDenial(trip.getStatus(), trip.getTripDate(), today);
        if (denial.isPresent()) {
            throw conflict(denial.get());
        }
        trip.cancel(Instant.now());
        notifyParticipants(trip, NotificationType.group_trip_cancelled);
        return detail(trip, userId, today);
    }

    // ---------------------------------------------------------------- внутреннее

    /** Все участники, кроме организатора (он сам совершил действие), получают уведомление о закрытии/отмене. */
    private void notifyParticipants(GroupTrip trip, NotificationType type) {
        Map<String, Object> payload = tripPayload(trip);
        for (GroupTripParticipant p : participants.findByTripIdOrderByJoinedAtAscIdAsc(trip.getId())) {
            if (!p.getUserId().equals(trip.getOrganizerId())) {
                notifications.send(p.getUserId(), type, new LinkedHashMap<>(payload));
            }
        }
    }

    private static Map<String, Object> tripPayload(GroupTrip trip) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("tripId", trip.getId().toString());
        payload.put("route", trip.getRoute());
        payload.put("date", trip.getTripDate().toString());
        return payload;
    }

    private GroupTrip organizerTripForUpdate(UUID userId, UUID tripId) {
        GroupTrip trip = trips.findByIdForUpdate(tripId).orElseThrow(GroupTripService::notFound);
        if (!trip.getOrganizerId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Это действие доступно только организатору поездки");
        }
        return trip;
    }

    private GroupTripDetailResponse detail(GroupTrip trip, UUID viewerId, LocalDate today) {
        List<GroupTripParticipant> rows = participants.findByTripIdOrderByJoinedAtAscIdAsc(trip.getId());
        Map<UUID, User> byId = userMap(rows.stream().map(GroupTripParticipant::getUserId).toList());
        List<ParticipantResponse> list = rows.stream().map(p -> {
            User u = byId.get(p.getUserId());
            return new ParticipantResponse(p.getUserId(),
                    u == null ? null : GroupTripRules.displayName(u.getFirstName(), u.getLastName()),
                    u == null ? null : u.getRatingAvg(),
                    p.getUserId().equals(trip.getOrganizerId()),
                    p.getJoinedAt());
        }).toList();
        boolean joined = rows.stream().anyMatch(p -> p.getUserId().equals(viewerId));
        return new GroupTripDetailResponse(trip.getId(), trip.getOrganizerId(), trip.getRoute(), trip.getTripDate(),
                trip.getStatus(), trip.getMaxParticipants(), rows.size(), rows.size() >= trip.getMaxParticipants(),
                joined, joined && GroupTripRules.chatWritable(trip.getStatus(), trip.getTripDate(), today),
                trip.getCreatedAt(), trip.getClosedAt(), trip.getCancelledAt(), list);
    }

    private Map<UUID, User> userMap(List<UUID> ids) {
        List<UUID> distinct = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) return Map.of();
        return users.findAllById(distinct).stream().collect(Collectors.toMap(User::getId, Function.identity()));
    }

    /** Раздел 2: групповые поездки доступны только verified-пользователю (то же правило, что у бронирования). */
    private User requireVerified(UUID userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Пользователь не найден"));
        if (user.getVerificationStatus() != VerificationStatus.verified) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Групповые поездки доступны после подтверждения водительского удостоверения");
        }
        return user;
    }

    private LocalDate today() {
        return LocalDate.now(ZoneId.of(timezone));
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Поездка не найдена");
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
