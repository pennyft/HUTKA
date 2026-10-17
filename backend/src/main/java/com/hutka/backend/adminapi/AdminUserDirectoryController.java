package com.hutka.backend.adminapi;

import com.hutka.backend.adminapi.dto.AdminPage;
import com.hutka.backend.adminapi.dto.AdminRatingItem;
import com.hutka.backend.adminapi.dto.AdminUserDetailResponse;
import com.hutka.backend.adminapi.dto.AdminUserSummary;
import com.hutka.backend.adminapi.dto.ReasonRequest;
import com.hutka.backend.adminapi.service.AdminUserDirectoryService;
import com.hutka.backend.auth.enums.VerificationStatus;
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
 * Раздел 16.2. Живёт рядом с AdminUserController (license-requests, approve, reject) под тем же базовым путём: статические
 * сегменты (/license-requests) Spring выбирает раньше /{id}, конфликта маршрутов нет.
 */
@RestController
@RequestMapping("/admin/users")
@RequiredArgsConstructor
public class AdminUserDirectoryController {

    private final AdminUserDirectoryService userService;

    /** Фильтры: статус верификации, партнёр, заблокирован, q — часть имени, фамилии, email или телефона. */
    @GetMapping
    public AdminPage<AdminUserSummary> list(@RequestParam(required = false) VerificationStatus verificationStatus,
                                            @RequestParam(required = false) Boolean partner,
                                            @RequestParam(required = false) Boolean blocked,
                                            @RequestParam(required = false) String q,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "20") int size) {
        return userService.list(verificationStatus, partner, blocked, q, page, size);
    }

    @GetMapping("/{id}")
    public AdminUserDetailResponse details(@PathVariable UUID id) {
        return userService.get(id);
    }

    @GetMapping("/{id}/ratings")
    public AdminPage<AdminRatingItem> ratings(@PathVariable UUID id,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return userService.ratings(id, page, size);
    }

    @PostMapping("/{id}/block")
    public AdminUserDetailResponse block(@AuthenticationPrincipal UUID adminId, @PathVariable UUID id,
                                         @Valid @RequestBody ReasonRequest body) {
        return userService.block(adminId, id, body.reason());
    }

    @PostMapping("/{id}/unblock")
    public AdminUserDetailResponse unblock(@PathVariable UUID id) {
        return userService.unblock(id);
    }
}
