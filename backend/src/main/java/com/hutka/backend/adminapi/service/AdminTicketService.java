package com.hutka.backend.adminapi.service;

import com.hutka.backend.adminapi.Admin;
import com.hutka.backend.adminapi.AdminRepository;
import com.hutka.backend.adminapi.AdminUserRepository;
import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.dto.AdminTicketDetailResponse;
import com.hutka.backend.adminapi.dto.AdminTicketStatsResponse;
import com.hutka.backend.adminapi.dto.AdminTicketSummary;
import com.hutka.backend.auth.User;
import com.hutka.backend.notifications.enums.NotificationType;
import com.hutka.backend.notifications.service.NotificationService;
import com.hutka.backend.support.Ticket;
import com.hutka.backend.support.TicketMessage;
import com.hutka.backend.support.TicketMessageRepository;
import com.hutka.backend.support.TicketRepository;
import com.hutka.backend.support.TicketRules;
import com.hutka.backend.support.TicketSpecifications;
import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketAuthorType;
import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.support.enums.TicketPriority;
import com.hutka.backend.support.enums.TicketStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Раздел 14 и 16.7: очередь тикетов, карточка, ответ из панели, закрытие, статистика времени ответа.
 * Изменяющие операции берут блокировку строки тикета (как disputes.findByIdForUpdate): ответ и закрытие
 * одного тикета двумя администраторами выполняются по очереди.
 */
@Service
@RequiredArgsConstructor
public class AdminTicketService {

    private static final int MAX_PAGE_SIZE = 100;

    private final TicketRepository tickets;
    private final TicketMessageRepository messages;
    private final AdminUserRepository users;
    private final AdminRepository admins;
    private final NotificationService notifications;

    // ---------------------------------------------------------------- очередь и история

    /**
     * status = open (по умолчанию) — очередь: сначала urgent, затем дольше всех ждущие ответа (14, 16.7).
     * status = closed — история: недавно закрытые первыми. Остальные фильтры необязательны.
     */
    @Transactional(readOnly = true)
    public AdminPage<AdminTicketSummary> list(TicketStatus status, TicketPriority priority, TicketCategory category,
                                              TicketAudience audience, int page, int size) {
        TicketStatus effective = status == null ? TicketStatus.open : status;
        Specification<Ticket> spec = TicketSpecifications.status(effective)
                .and(TicketSpecifications.priority(priority))
                .and(TicketSpecifications.category(category))
                .and(TicketSpecifications.audience(audience))
                .and(effective == TicketStatus.open ? TicketSpecifications.openQueueOrder() : TicketSpecifications.closedHistoryOrder());
        Page<Ticket> result = tickets.findAll(spec,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE)));

        Map<UUID, User> userById = userById(result.getContent().stream().map(Ticket::getUserId).toList());
        return new AdminPage<>(result.getTotalElements(), result.getContent().stream()
                .map(t -> new AdminTicketSummary(t.getId(), t.getUserId(), name(userById.get(t.getUserId())), t.getAudience(),
                        t.getSubject(), t.getCategory(), t.getPriority(), t.getStatus(), t.getCreatedAt(), t.getUpdatedAt(),
                        t.getAwaitingAdminSince(), t.getClosedAt()))
                .toList());
    }

    // ---------------------------------------------------------------- карточка

    @Transactional(readOnly = true)
    public AdminTicketDetailResponse get(UUID ticketId) {
        Ticket ticket = tickets.findById(ticketId).orElseThrow(AdminTicketService::notFound);
        return detail(ticket);
    }

    // ---------------------------------------------------------------- ответ

    /**
     * Ответ администратора в открытый тикет. Ожидание ответа снимается, первый ответ фиксируется для статистики.
     * Пользователь получает уведомление ticket_message (13); у системного тикета получателя нет.
     * В закрытый тикет писать нельзя — 409 (переоткрывает только пользователь, 14).
     */
    @Transactional
    public AdminTicketDetailResponse.Message reply(UUID adminId, UUID ticketId, String body) {
        Ticket ticket = tickets.findByIdForUpdate(ticketId).orElseThrow(AdminTicketService::notFound);
        if (ticket.getStatus() == TicketStatus.closed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Тикет закрыт");
        }
        String text;
        try {
            text = TicketRules.normalize(body, TicketRules.TEXT_MAX, "Сообщение");
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
        Instant now = Instant.now();
        TicketMessage message = messages.save(TicketMessage.builder()
                .ticketId(ticketId)
                .authorType(TicketAuthorType.admin)
                .authorAdminId(adminId)
                .body(text)
                .createdAt(now)
                .build());
        ticket.recordAdminMessage(now);

        if (ticket.getUserId() != null) {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("ticketId", ticket.getId().toString());
            payload.put("messageId", message.getId().toString());
            payload.put("subject", ticket.getSubject());
            notifications.send(ticket.getUserId(), NotificationType.ticket_message, payload);
        }
        String adminName = admins.findById(adminId).map(Admin::getDisplayName).orElse(null);
        return new AdminTicketDetailResponse.Message(message.getId(), TicketAuthorType.admin, adminId, adminName,
                message.getBody(), message.getCreatedAt());
    }

    // ---------------------------------------------------------------- закрытие

    /** Закрывает тикет (14: закрывает администратор). Пользователь получает ticket_closed и 7 дней на переоткрытие. */
    @Transactional
    public AdminTicketDetailResponse close(UUID adminId, UUID ticketId) {
        Ticket ticket = tickets.findByIdForUpdate(ticketId).orElseThrow(AdminTicketService::notFound);
        if (ticket.getStatus() == TicketStatus.closed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Тикет уже закрыт");
        }
        ticket.close(adminId, Instant.now());

        if (ticket.getUserId() != null) {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("ticketId", ticket.getId().toString());
            payload.put("subject", ticket.getSubject());
            notifications.send(ticket.getUserId(), NotificationType.ticket_closed, payload);
        }
        return detail(ticket);
    }

    // ---------------------------------------------------------------- статистика

    /** Раздел 16.7: «статистика по времени ответа» — счётчики очереди и время первого ответа за последние 30 дней. */
    @Transactional(readOnly = true)
    public AdminTicketStatsResponse stats() {
        Instant since = Instant.now().minus(TicketRules.STATS_WINDOW);
        List<Long> seconds = tickets.findResponseTimesSince(since).stream()
                .map(r -> TicketRules.responseSeconds(r.getCreatedAt(), r.getFirstAdminReplyAt()))
                .toList();
        return new AdminTicketStatsResponse(
                tickets.countByStatus(TicketStatus.open),
                tickets.countByStatusAndPriority(TicketStatus.open, TicketPriority.urgent),
                tickets.countByStatusAndAwaitingAdminSinceIsNotNull(TicketStatus.open),
                (int) TicketRules.STATS_WINDOW.toDays(),
                seconds.size(),
                TicketRules.average(seconds).isPresent() ? TicketRules.average(seconds).getAsDouble() : null,
                TicketRules.median(seconds).isPresent() ? TicketRules.median(seconds).getAsDouble() : null);
    }

    // ---------------------------------------------------------------- внутреннее

    private AdminTicketDetailResponse detail(Ticket ticket) {
        List<TicketMessage> thread = messages.findByTicketIdOrderByCreatedAtAscIdAsc(ticket.getId());

        List<UUID> userIds = new ArrayList<>();
        userIds.add(ticket.getUserId());
        thread.forEach(m -> userIds.add(m.getAuthorUserId()));
        Map<UUID, User> userById = userById(userIds);

        List<UUID> adminIds = new ArrayList<>();
        adminIds.add(ticket.getClosedByAdminId());
        thread.forEach(m -> adminIds.add(m.getAuthorAdminId()));
        Map<UUID, Admin> adminById = admins.findAllById(adminIds.stream().filter(Objects::nonNull).distinct().toList())
                .stream().collect(Collectors.toMap(Admin::getId, Function.identity()));

        User requester = userById.get(ticket.getUserId());
        Admin closedBy = adminById.get(ticket.getClosedByAdminId());
        return new AdminTicketDetailResponse(ticket.getId(), ticket.getAudience(),
                ticket.getUserId() == null ? null : new AdminTicketDetailResponse.Requester(
                        ticket.getUserId(), name(requester),
                        requester == null ? null : requester.getEmail(),
                        requester == null ? null : requester.getPhone(),
                        requester != null && requester.isPartner()),
                ticket.getSubject(), ticket.getDescription(), ticket.getCategory(), ticket.getPriority(), ticket.getStatus(),
                ticket.getCreatedAt(), ticket.getUpdatedAt(), ticket.getAwaitingAdminSince(), ticket.getFirstAdminReplyAt(),
                ticket.getClosedAt(), ticket.getClosedByAdminId(), closedBy == null ? null : closedBy.getDisplayName(),
                ticket.getReopenedAt(),
                thread.stream().map(m -> new AdminTicketDetailResponse.Message(m.getId(), m.getAuthorType(),
                        m.getAuthorType() == TicketAuthorType.admin ? m.getAuthorAdminId() : m.getAuthorUserId(),
                        authorName(m, userById, adminById), m.getBody(), m.getCreatedAt())).toList());
    }

    private static String authorName(TicketMessage m, Map<UUID, User> userById, Map<UUID, Admin> adminById) {
        return switch (m.getAuthorType()) {
            case user -> name(userById.get(m.getAuthorUserId()));
            case admin -> {
                Admin admin = adminById.get(m.getAuthorAdminId());
                yield admin == null ? null : admin.getDisplayName();
            }
            case ai -> null;
        };
    }

    private Map<UUID, User> userById(List<UUID> ids) {
        List<UUID> distinct = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) return new HashMap<>(); // не Map.of(): get(null) у неизменяемой карты бросает NPE, а userId системного тикета = null
        return users.findByIdIn(distinct).stream().collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private static String name(User user) {
        return user == null ? null : user.getFirstName() + " " + user.getLastName();
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Тикет не найден");
    }
}
