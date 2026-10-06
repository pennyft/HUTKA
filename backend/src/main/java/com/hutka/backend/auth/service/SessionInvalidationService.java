package com.hutka.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Раздел 3.3: после смены пароля все выданные ранее токены перестают действовать.
 * Время хранится в СЕКУНДАХ: claim iat в JWT имеет секундную точность (RFC 7519, NumericDate),
 * поэтому сравнивать его с миллисекундами некорректно.
 */
@Service
@RequiredArgsConstructor
public class SessionInvalidationService {

    // Новый префикс: старые ключи хранили миллисекунды, смешивать форматы нельзя
    private static final String KEY_PREFIX = "session-invalidated-at-s:";

    private final StringRedisTemplate redisTemplate;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    public void invalidateAllSessions(UUID userId) {
        String now = String.valueOf(Instant.now().getEpochSecond());
        redisTemplate.opsForValue().set(KEY_PREFIX + userId, now, Duration.ofMillis(jwtExpirationMs));
    }

    /** @return момент инвалидации в секундах или null, если сессии не сбрасывались */
    public Long getInvalidatedAtSec(UUID userId) {
        String value = redisTemplate.opsForValue().get(KEY_PREFIX + userId);
        return value == null ? null : Long.parseLong(value);
    }
}
