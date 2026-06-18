package com.hutka.backend.dispute;

import com.hutka.backend.dispute.dto.DisputeRequest;
import com.hutka.backend.dispute.dto.DisputeResponse;
import com.hutka.backend.dispute.enums.DisputeStatus;
import com.hutka.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/disputes")
@RequiredArgsConstructor
public class DisputeController {

    private final DisputeService disputeService;

    // ───── ПОЛЬЗОВАТЕЛЬ / ПАРТНЁР ─────

    @PostMapping
    public ResponseEntity<DisputeResponse> openDispute(
            @RequestBody DisputeRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(disputeService.openDispute(request, user));
    }

    @GetMapping("/{disputeId}")
    public ResponseEntity<DisputeResponse> getDisputeById(
            @PathVariable UUID disputeId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(disputeService.getDisputeById(disputeId, user));
    }

    @GetMapping("/my")
    public ResponseEntity<List<DisputeResponse>> getMyDisputes(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(disputeService.getMyDisputes(user.getId()));
    }

    // ───── МОДЕРАТОР ─────

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<DisputeResponse>> getDisputesByStatus(
            @RequestParam(required = false, defaultValue = "OPEN") DisputeStatus status) {
        return ResponseEntity.ok(disputeService.getDisputesByStatus(status));
    }

    @PatchMapping("/admin/{disputeId}/review")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DisputeResponse> takeInReview(
            @PathVariable UUID disputeId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(disputeService.takeInReview(disputeId, user));
    }

    @PatchMapping("/admin/{disputeId}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DisputeResponse> resolveDispute(
            @PathVariable UUID disputeId,
            @RequestParam String resolution,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(disputeService.resolveDispute(disputeId, resolution, user));
    }

    @PatchMapping("/admin/{disputeId}/close")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<DisputeResponse> closeDispute(
            @PathVariable UUID disputeId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(disputeService.closeDispute(disputeId, user));
    }
}