package com.hutka.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;


@Service
@RequiredArgsConstructor
public class SessionInvalidationService {

    private static final String KEY_PREFIX = "session-invalidated-at:";

    private final StringRedisTemplate redisTemplate;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    public void invalidateAllSessions(UUID userId) {
        String key = KEY_PREFIX + userId;
        String now = String.valueOf(Instant.now().toEpochMilli());
        redisTemplate.opsForValue().set(key, now, Duration.ofMillis(jwtExpirationMs));
    }

    public Long getInvalidatedAtMs(UUID userId) {
        String value = redisTemplate.opsForValue().get(KEY_PREFIX + userId);
        return value == null ? null : Long.parseLong(value);
    }
}