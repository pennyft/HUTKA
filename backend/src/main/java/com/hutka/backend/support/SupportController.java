package com.hutka.backend.support;

import com.hutka.backend.support.dto.CreateTicketRequest;
import com.hutka.backend.support.dto.ReopenTicketRequest;
import com.hutka.backend.support.dto.TicketDetailResponse;
import com.hutka.backend.support.dto.TicketListResponse;
import com.hutka.backend.support.dto.TicketMessageRequest;
import com.hutka.backend.support.dto.TicketMessageResponse;
import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketStatus;
import com.hutka.backend.support.service.SupportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Раздел 23.5: тикеты поддержки. Принципал — UUID пользователя из JwtAuthFilter. Эндпоинты администратора
 * (список всех тикетов, ответ, закрытие) — /admin/tickets (AdminTicketController): админская цепочка безопасности
 * обслуживает только /admin/**.
 */
@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;

    @PostMapping
    public ResponseEntity<TicketDetailResponse> create(@AuthenticationPrincipal UUID userId,
                                                       @Valid @RequestBody CreateTicketRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supportService.create(userId, request));
    }

    @GetMapping
    public TicketListResponse list(@AuthenticationPrincipal UUID userId,
                                   @RequestParam(required = false) TicketStatus status,
                                   @RequestParam(required = false) TicketAudience audience,
                                   @RequestParam(defaultValue = "0") int page,
                                   @RequestParam(defaultValue = "20") int size) {
        return supportService.list(userId, status, audience, page, size);
    }

    @GetMapping("/{id}")
    public TicketDetailResponse details(@AuthenticationPrincipal UUID userId, @PathVariable UUID id) {
        return supportService.get(userId, id);
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<TicketMessageResponse> addMessage(@AuthenticationPrincipal UUID userId, @PathVariable UUID id,
                                                            @Valid @RequestBody TicketMessageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supportService.addMessage(userId, id, request.body()));
    }

    @PatchMapping("/{id}/reopen")
    public TicketDetailResponse reopen(@AuthenticationPrincipal UUID userId, @PathVariable UUID id,
                                       @Valid @RequestBody(required = false) ReopenTicketRequest request) {
        return supportService.reopen(userId, id, request == null ? null : request.message());
    }
}
