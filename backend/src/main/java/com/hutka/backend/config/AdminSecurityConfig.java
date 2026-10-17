package com.hutka.backend.config;

import com.hutka.backend.adminapi.AdminRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Раздел 17.1: «Auth (админка) — сессионная аутентификация, отдельная security-конфигурация (SecurityFilterChain)».
 * Эта цепочка (Order 1) обслуживает только /admin/**; клиентская цепочка SecurityConfig (JWT, STATELESS) получает Order 2.
 * Сессия: серверная (JSESSIONID, HttpOnly), CSRF включён — токен выдаётся в теле ответа /admin/auth/login и /admin/auth/me
 * и принимается в заголовке X-CSRF-TOKEN. Вход выполняет AdminAuthService (форма Spring Security не используется).
 */
@Configuration
public class AdminSecurityConfig {

    /** Адрес панели администратора (react-admin). Если отдельного нет — тот же фронтенд, что и у клиентов. */
    @Value("${app.admin-base-url:${app.frontend-base-url}}")
    private String adminBaseUrl;

    /** Один экземпляр и для цепочки, и для AdminAuthService — иначе контекст, сохранённый при входе, цепочка не увидит. */
    @Bean
    public HttpSessionSecurityContextRepository adminSecurityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    @Order(1)
    public SecurityFilterChain adminFilterChain(HttpSecurity http,
                                                HttpSessionSecurityContextRepository adminSecurityContextRepository,
                                                AdminRepository adminRepository) throws Exception {
        http
                .securityMatcher("/admin/**")
                .cors(cors -> cors.configurationSource(adminCorsConfigurationSource()))
                // Токен хранится в сессии и передаётся в теле/заголовке, а не читается клиентом из cookie —
                // работает и когда панель и API на разных поддоменах. Вход (ещё нет сессии) от CSRF освобождён.
                .csrf(csrf -> csrf
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler())
                        .ignoringRequestMatchers("/admin/auth/login"))
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .securityContext(sc -> sc.securityContextRepository(adminSecurityContextRepository))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .logout(logout -> logout
                        .logoutUrl("/admin/auth/logout")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/admin/auth/login").permitAll()
                        .anyRequest().hasRole("ADMIN"))
                .addFilterAfter(new AdminActiveFilter(adminRepository), SecurityContextHolderFilter.class)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable);
        return http.build();
    }

    private CorsConfigurationSource adminCorsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(adminBaseUrl));
        config.setAllowedMethods(List.of("GET", "POST", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/admin/**", config);
        return source;
    }
}
