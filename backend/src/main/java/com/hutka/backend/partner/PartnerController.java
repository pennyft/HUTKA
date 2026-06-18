package com.hutka.backend.partner;

import com.hutka.backend.partner.dto.PartnerApplicationRequest;
import com.hutka.backend.partner.dto.PartnerApplicationResponse;
import com.hutka.backend.partner.enums.ApplicationStatus;
import com.hutka.backend.user.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/partner")
@RequiredArgsConstructor
public class PartnerController {

    private final PartnerService partnerService;

    // ───── ПОЛЬЗОВАТЕЛЬ ─────

    @PostMapping("/apply")
    public ResponseEntity<PartnerApplicationResponse> apply(
            @RequestBody PartnerApplicationRequest request,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(partnerService.apply(request, user));
    }

    @GetMapping("/my-application")
    public ResponseEntity<PartnerApplicationResponse> getMyApplication(
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(partnerService.getMyApplication(user.getId()));
    }

    // ───── МОДЕРАТОР ─────

    @GetMapping("/admin/applications")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<PartnerApplicationResponse>> getApplicationsByStatus(
            @RequestParam(required = false, defaultValue = "PENDING") ApplicationStatus status) {
        return ResponseEntity.ok(partnerService.getApplicationsByStatus(status));
    }

    @PatchMapping("/admin/applications/{applicationId}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PartnerApplicationResponse> approveApplication(
            @PathVariable UUID applicationId,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(partnerService.approveApplication(applicationId, user));
    }

    @PatchMapping("/admin/applications/{applicationId}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<PartnerApplicationResponse> rejectApplication(
            @PathVariable UUID applicationId,
            @RequestParam String reason,
            @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(partnerService.rejectApplication(applicationId, reason, user));
    }
}
