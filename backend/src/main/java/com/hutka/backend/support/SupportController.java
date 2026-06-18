package com.hutka.backend.support;

import com.hutka.backend.support.dto.*;
import com.hutka.backend.support.enums.TicketStatus;
import com.hutka.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/support")
@RequiredArgsConstructor
public class SupportController {

    private final SupportService supportService;

    // ───── ПОЛЬЗОВАТЕЛЬ ─────

    @PostMapping
    public ResponseEntity<SupportTicketResponse> createTicket(
            @RequestBody SupportTicketRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(supportService.createTicket(request, user));
    }

    @GetMapping("/{ticketId}")
    public ResponseEntity<SupportTicketResponse> getTicketById(
            @PathVariable UUID ticketId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(supportService.getTicketById(ticketId, user));
    }

    @GetMapping("/my")
    public ResponseEntity<List<SupportTicketResponse>> getMyTickets(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(supportService.getMyTickets(user.getId()));
    }

    @PostMapping("/{ticketId}/messages")
    public ResponseEntity<SupportTicketResponse> sendMessage(
            @PathVariable UUID ticketId,
            @RequestBody SupportMessageRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(supportService.sendMessage(ticketId, request, user));
    }

    // ───── МОДЕРАТОР ─────

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<SupportTicketResponse>> getTicketsByStatus(
            @RequestParam(required = false, defaultValue = "OPEN") TicketStatus status) {
        return ResponseEntity.ok(supportService.getTicketsByStatus(status));
    }

    @PatchMapping("/admin/{ticketId}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportTicketResponse> resolveTicket(@PathVariable UUID ticketId) {
        return ResponseEntity.ok(supportService.resolveTicket(ticketId));
    }

    @PatchMapping("/admin/{ticketId}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SupportTicketResponse> closeTicket(@PathVariable UUID ticketId) {
        return ResponseEntity.ok(supportService.closeTicket(ticketId));
    }
}
