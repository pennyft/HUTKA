package com.hutka.backend.support.service;

import com.hutka.backend.support.Ticket;
import com.hutka.backend.support.TicketMessage;
import com.hutka.backend.support.TicketMessageRepository;
import com.hutka.backend.support.TicketRepository;
import com.hutka.backend.support.TicketRules;
import com.hutka.backend.support.TicketSpecifications;
import com.hutka.backend.support.dto.CreateTicketRequest;
import com.hutka.backend.support.dto.TicketDetailResponse;
import com.hutka.backend.support.dto.TicketListResponse;
import com.hutka.backend.support.dto.TicketMessageResponse;
import com.hutka.backend.support.dto.TicketResponse;
import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketAuthorType;
import com.hutka.backend.support.enums.TicketPriority;
import com.hutka.backend.support.enums.TicketStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Раздел 14 и 23.5: тикеты глазами пользователя (арендатора или партнёра). Чужой тикет неотличим от несуществующего (404).
 * Ответы администратора и закрытие — в AdminTicketService. Решения, которых нет в Hutka.md дословно, — в docs/SUPPORT_DECISIONS.md.
 */
@Service
@RequiredArgsConstructor
public class SupportService {

    private static final int MAX_PAGE_SIZE = 100;

    private final TicketRepository tickets;
    private final TicketMessageRepository messages;

    // ---------------------------------------------------------------- POST /tickets

    @Transactional
    public TicketDetailResponse create(UUID userId, CreateTicketRequest request) {
        TicketAudience audience = request.audience() == null ? TicketAudience.renter : request.audience();
        if (audience == TicketAudience.system) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Недопустимый тип обращения");
        }
        Instant now = Instant.now();
        Ticket ticket = tickets.save(Ticket.builder()
                .userId(userId)
                .audience(audience)
                .subject(clean(request.subject(), TicketRules.SUBJECT_MAX, "Тема"))
                .description(clean(request.description(), TicketRules.TEXT_MAX, "Описание"))
                .category(request.category())
                .priority(request.priority() == null ? TicketPriority.normal : request.priority())
                .status(TicketStatus.open)
                .createdAt(now)
                .updatedAt(now)
                .awaitingAdminSince(now)
                .build());
        return TicketDetailResponse.from(ticket, List.of(), now);
    }

    // ---------------------------------------------------------------- GET /tickets

    /** Тикеты текущего пользователя: последняя активность сверху; фильтры по статусу и кабинету (audience) необязательны. */
    @Transactional(readOnly = true)
    public TicketListResponse list(UUID userId, TicketStatus status, TicketAudience audience, int page, int size) {
        Page<Ticket> result = tickets.findAll(
                TicketSpecifications.owner(userId)
                        .and(TicketSpecifications.status(status))
                        .and(TicketSpecifications.audience(audience)),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), MAX_PAGE_SIZE),
                        Sort.by(Sort.Order.desc("updatedAt"), Sort.Order.asc("id"))));
        Instant now = Instant.now();
        return new TicketListResponse(result.getTotalElements(),
                result.getContent().stream().map(t -> TicketResponse.from(t, now)).toList());
    }

    // ---------------------------------------------------------------- GET /tickets/:id

    @Transactional(readOnly = true)
    public TicketDetailResponse get(UUID userId, UUID ticketId) {
        Ticket ticket = tickets.findById(ticketId)
                .filter(t -> userId.equals(t.getUserId()))
                .orElseThrow(SupportService::notFound);
        return TicketDetailResponse.from(ticket, messages.findByTicketIdOrderByCreatedAtAscIdAsc(ticketId), Instant.now());
    }

    // ---------------------------------------------------------------- POST /tickets/:id/messages

    /** Сообщение пользователя в открытый тикет. В закрытый — нельзя: сначала переоткрытие (14) или новый тикет. */
    @Transactional
    public TicketMessageResponse addMessage(UUID userId, UUID ticketId, String body) {
        Ticket ticket = ownTicketForUpdate(userId, ticketId);
        if (ticket.getStatus() == TicketStatus.closed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Тикет закрыт. Переоткройте его в течение 7 дней после закрытия или создайте новый");
        }
        Instant now = Instant.now();
        TicketMessage message = saveUserMessage(ticket, userId, body, now);
        return TicketMessageResponse.from(message);
    }

    // ---------------------------------------------------------------- PATCH /tickets/:id/reopen

    /**
     * Раздел 14: закрытый тикет можно переоткрыть в течение 7 дней после закрытия — он возвращается в open
     * с сохранением переписки. Необязательное пояснение добавляется в переписку.
     */
    @Transactional
    public TicketDetailResponse reopen(UUID userId, UUID ticketId, String explanation) {
        Ticket ticket = ownTicketForUpdate(userId, ticketId);
        if (ticket.getStatus() != TicketStatus.closed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Тикет уже открыт");
        }
        Instant now = Instant.now();
        if (!TicketRules.canReopen(ticket.getClosedAt(), now)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Срок переоткрытия (7 дней после закрытия) истёк. Создайте новый тикет");
        }
        ticket.reopen(now);
        if (explanation != null && !explanation.isBlank()) {
            saveUserMessage(ticket, userId, explanation, now);
        }
        return TicketDetailResponse.from(ticket, messages.findByTicketIdOrderByCreatedAtAscIdAsc(ticketId), now);
    }

    // ---------------------------------------------------------------- внутреннее

    private TicketMessage saveUserMessage(Ticket ticket, UUID userId, String body, Instant now) {
        TicketMessage message = messages.save(TicketMessage.builder()
                .ticketId(ticket.getId())
                .authorType(TicketAuthorType.user)
                .authorUserId(userId)
                .body(clean(body, TicketRules.TEXT_MAX, "Сообщение"))
                .createdAt(now)
                .build());
        ticket.recordUserMessage(now);
        return message;
    }

    private Ticket ownTicketForUpdate(UUID userId, UUID ticketId) {
        return tickets.findByIdForUpdate(ticketId)
                .filter(t -> userId.equals(t.getUserId()))
                .orElseThrow(SupportService::notFound);
    }

    private static String clean(String raw, int max, String field) {
        try {
            return TicketRules.normalize(raw, max, field);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    private static ResponseStatusException notFound() {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Тикет не найден");
    }
}
