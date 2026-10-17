package com.hutka.backend.adminapi;

import com.hutka.backend.adminapi.dto.AdminChangePasswordRequest;
import com.hutka.backend.adminapi.dto.AdminLoginRequest;
import com.hutka.backend.adminapi.dto.AdminSessionResponse;
import com.hutka.backend.adminapi.service.AdminAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Вход и сессия администратора (раздел 17.1). Выход — POST /admin/auth/logout (обрабатывается в AdminSecurityConfig).
 * Клиент хранит session-cookie (credentials: 'include') и отправляет csrfToken из ответа в заголовке X-CSRF-TOKEN.
 */
@RestController
@RequestMapping("/admin/auth")
@RequiredArgsConstructor
public class AdminAuthController {

    private final AdminAuthService authService;

    @PostMapping("/login")
    public AdminSessionResponse login(@Valid @RequestBody AdminLoginRequest body,
                                      HttpServletRequest request,
                                      HttpServletResponse response,
                                      CsrfToken csrfToken) {
        Admin admin = authService.login(body.email(), body.password(), request, response);
        return toResponse(admin, csrfToken);
    }

    /** Проверка сессии при загрузке панели; заодно выдаёт актуальный CSRF-токен. */
    @GetMapping("/me")
    public AdminSessionResponse me(@AuthenticationPrincipal UUID adminId, CsrfToken csrfToken) {
        return toResponse(authService.requireActive(adminId), csrfToken);
    }

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal UUID adminId, @Valid @RequestBody AdminChangePasswordRequest body) {
        authService.changePassword(adminId, body.currentPassword(), body.newPassword());
    }

    private static AdminSessionResponse toResponse(Admin admin, CsrfToken csrfToken) {
        return new AdminSessionResponse(admin.getId(), admin.getEmail(), admin.getDisplayName(), csrfToken.getToken());
    }
}
