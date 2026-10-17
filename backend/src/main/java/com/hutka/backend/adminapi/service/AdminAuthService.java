package com.hutka.backend.adminapi.service;

import com.hutka.backend.adminapi.Admin;
import com.hutka.backend.adminapi.AdminRepository;
import com.hutka.backend.auth.service.RateLimitService;
import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

/**
 * Вход администратора (раздел 17.1: сессионная аутентификация, отдельный контур от клиентского JWT).
 * Принципал сессии — UUID администратора с ролью ROLE_ADMIN, как у пользователей принципал — их UUID.
 */
@Service
@RequiredArgsConstructor
public class AdminAuthService {

    private static final int LOGIN_MAX_ATTEMPTS = 5;
    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);
    private static final int PASSWORD_CHANGE_MAX_ATTEMPTS = 5;
    private static final Duration PASSWORD_CHANGE_WINDOW = Duration.ofMinutes(15);
    private static final String INVALID_CREDENTIALS = "Неверный email или пароль";

    private final AdminRepository admins;
    private final PasswordEncoder passwordEncoder;
    private final RateLimitService rateLimitService;
    private final HttpSessionSecurityContextRepository securityContextRepository;

    /** Для неизвестного email пароль всё равно сверяется с этим хешем — время ответа не выдаёт, существует ли учётка. */
    private String dummyHash;

    @PostConstruct
    void init() {
        dummyHash = passwordEncoder.encode(UUID.randomUUID().toString());
    }

    @Transactional
    public Admin login(String rawEmail, String password, HttpServletRequest request, HttpServletResponse response) {
        String email = rawEmail.trim().toLowerCase(Locale.ROOT);
        String limitKey = "admin-login:" + email;
        rateLimitService.check(limitKey, LOGIN_MAX_ATTEMPTS, LOGIN_WINDOW);

        Admin admin = admins.findByEmail(email).orElse(null);
        boolean passwordOk = passwordEncoder.matches(password, admin != null ? admin.getPasswordHash() : dummyHash);
        if (admin == null || !admin.isEnabled() || !passwordOk) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS);
        }
        rateLimitService.reset(limitKey);
        admin.setLastLoginAt(Instant.now());
        openSession(admin, request, response);
        return admin;
    }

    /** Данные текущего администратора для GET /admin/auth/me. */
    @Transactional(readOnly = true)
    public Admin requireActive(UUID adminId) {
        return admins.findById(adminId)
                .filter(Admin::isEnabled)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Сессия недействительна"));
    }

    @Transactional
    public void changePassword(UUID adminId, String currentPassword, String newPassword) {
        rateLimitService.check("admin-change-password:" + adminId, PASSWORD_CHANGE_MAX_ATTEMPTS, PASSWORD_CHANGE_WINDOW);
        Admin admin = admins.findById(adminId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Сессия недействительна"));
        if (!passwordEncoder.matches(currentPassword, admin.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Текущий пароль неверен");
        }
        if (passwordEncoder.matches(newPassword, admin.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Новый пароль совпадает с текущим");
        }
        admin.setPasswordHash(passwordEncoder.encode(newPassword));
    }

    /**
     * Защита от фиксации сессии: идентификатор меняется при входе. SecurityContext сохраняется в сессию явно —
     * в Spring Security 6 автоматического сохранения после ручной аутентификации нет.
     */
    private void openSession(Admin admin, HttpServletRequest request, HttpServletResponse response) {
        HttpSession existing = request.getSession(false);
        if (existing != null) {
            request.changeSessionId();
        } else {
            request.getSession(true);
        }
        var authentication = new UsernamePasswordAuthenticationToken(
                admin.getId(), null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }
}
