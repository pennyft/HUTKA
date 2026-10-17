package com.hutka.backend.config;

import com.hutka.backend.adminapi.Admin;
import com.hutka.backend.adminapi.AdminRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Каждый запрос администратора перепроверяет, что учётка существует и enabled: отключение (admins.enabled = false)
 * действует сразу, а не после таймаута сессии. Намеренно НЕ @Component — иначе Spring Boot зарегистрирует фильтр
 * для всех запросов, а не только для цепочки /admin/** (см. AdminSecurityConfig).
 */
@RequiredArgsConstructor
class AdminActiveFilter extends OncePerRequestFilter {

    private final AdminRepository admins;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UUID adminId
                && admins.findById(adminId).filter(Admin::isEnabled).isEmpty()) {
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            SecurityContextHolder.clearContext();
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            return;
        }
        filterChain.doFilter(request, response);
    }
}
