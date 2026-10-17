package com.hutka.backend.adminapi;

import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.dto.AdminTicketDetailResponse;
import com.hutka.backend.adminapi.dto.AdminTicketStatsResponse;
import com.hutka.backend.adminapi.dto.AdminTicketSummary;
import com.hutka.backend.adminapi.service.AdminTicketService;
import com.hutka.backend.support.dto.TicketMessageRequest;
import com.hutka.backend.support.enums.TicketAudience;
import com.hutka.backend.support.enums.TicketCategory;
import com.hutka.backend.support.enums.TicketPriority;
import com.hutka.backend.support.enums.TicketStatus;
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
 * Раздел 16.7 и 23.5 (GET /tickets для администратора, POST /tickets/:id/messages, PATCH /tickets/:id/close).
 * Путь с префиксом /admin: админская цепочка безопасности (AdminSecurityConfig, сессия) обслуживает только /admin/**.
 */
@RestController
@RequestMapping("/admin/tickets")
@RequiredArgsConstructor
public class AdminTicketController {

    private final AdminTicketService ticketService;

    /** status=open (по умолчанию) — очередь; status=closed — история. Фильтры priority, category, audience необязательны. */
    @GetMapping
    public AdminPage<AdminTicketSummary> list(@RequestParam(required = false) TicketStatus status,
                                              @RequestParam(required = false) TicketPriority priority,
                                              @RequestParam(required = false) TicketCategory category,
                                              @RequestParam(required = false) TicketAudience audience,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return ticketService.list(status, priority, category, audience, page, size);
    }

    @GetMapping("/stats")
    public AdminTicketStatsResponse stats() {
        return ticketService.stats();
    }

    @GetMapping("/{id}")
    public AdminTicketDetailResponse details(@PathVariable UUID id) {
        return ticketService.get(id);
    }

    @PostMapping("/{id}/messages")
    public ResponseEntity<AdminTicketDetailResponse.Message> reply(@AuthenticationPrincipal UUID adminId, @PathVariable UUID id,
                                                                   @Valid @RequestBody TicketMessageRequest body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.reply(adminId, id, body.body()));
    }

    @PatchMapping("/{id}/close")
    public AdminTicketDetailResponse close(@AuthenticationPrincipal UUID adminId, @PathVariable UUID id) {
        return ticketService.close(adminId, id);
    }
}
