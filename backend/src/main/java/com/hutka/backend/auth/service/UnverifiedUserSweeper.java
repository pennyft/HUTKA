package com.hutka.backend.auth.service;

import com.hutka.backend.auth.User;
import com.hutka.backend.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;

/**
 * Удаляет аккаунты, не подтвердившие email в течение TTL (по умолчанию 60 минут), чтобы email не «залипал».
 * Простая периодическая задача — Spring @Scheduled; @EnableScheduling включён в BookingSchedulingConfig.
 * Неподтверждённый пользователь не может войти (AuthService.login), поэтому зависимых данных у него нет.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UnverifiedUserSweeper {

    private final UserRepository users;
    private final VerificationCodeService codes;

    @Value("${app.auth.unverified-ttl-minutes:60}")
    private long ttlMinutes;

    @Scheduled(fixedDelayString = "${app.auth.unverified-sweep-interval-ms:300000}",
            initialDelayString = "${app.auth.unverified-sweep-initial-delay-ms:60000}")
    public void deleteExpired() {
        Instant cutoff = Instant.now().minus(Duration.ofMinutes(ttlMinutes));
        int deleted = 0;
        for (User u : users.findByEmailVerifiedFalseAndCreatedAtBefore(cutoff)) {
            try {
                if (users.deleteIfUnverified(u.getId()) > 0) {
                    codes.invalidate(u.getEmail());
                    deleted++;
                }
            } catch (RuntimeException e) {
                log.warn("Не удалось удалить неподтверждённого пользователя {}: {}", u.getId(), e.getMessage());
            }
        }
        if (deleted > 0) {
            log.info("Удалено неподтверждённых аккаунтов: {}", deleted);
        }
    }
}
