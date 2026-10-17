package com.hutka.backend.adminapi;

import com.hutka.backend.adminapi.dto.AdminDisputeDetailResponse;
import com.hutka.backend.adminapi.dto.AdminDisputeSummary;
import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.dto.ResolveDisputeRequest;
import com.hutka.backend.adminapi.service.AdminDisputeService;
import com.hutka.backend.disputes.enums.DisputeStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Раздел 16.6 и 23.5 (POST /disputes/:id/resolve). Путь с префиксом /admin: админская цепочка безопасности
 * (AdminSecurityConfig, сессия) обслуживает только /admin/**, клиентская цепочка с JWT администратора не знает.
 */
@RestController
@RequestMapping("/admin/disputes")
@RequiredArgsConstructor
public class AdminDisputeController {

    private final AdminDisputeService disputeService;

    /** status=open (по умолчанию) — очередь споров; status=resolved — история решений. */
    @GetMapping
    public AdminPage<AdminDisputeSummary> list(@RequestParam(required = false) DisputeStatus status,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        return disputeService.list(status, page, size);
    }

    @GetMapping("/{id}")
    public AdminDisputeDetailResponse details(@PathVariable UUID id) {
        return disputeService.get(id);
    }

    @PostMapping("/{id}/resolve")
    public AdminDisputeDetailResponse resolve(@AuthenticationPrincipal UUID adminId, @PathVariable UUID id,
                                              @Valid @RequestBody ResolveDisputeRequest body) {
        return disputeService.resolve(adminId, id, body);
    }
}
