package com.hutka.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;

/**
 * Раздел 3.1: 6-значный код подтверждения email.
 * Защита от перебора: после MAX_ATTEMPTS неверных вводов код удаляется, нужно запросить новый.
 */
@Service
@RequiredArgsConstructor
public class VerificationCodeService {

    private static final Duration CODE_TTL = Duration.ofMinutes(15);
    private static final int MAX_ATTEMPTS = 5;
    private static final String CODE_PREFIX = "email-verify:";
    private static final String ATTEMPTS_PREFIX = "email-verify-attempts:";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StringRedisTemplate redisTemplate;

    public String generateAndStore(String email) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        redisTemplate.opsForValue().set(CODE_PREFIX + email, code, CODE_TTL);
        redisTemplate.delete(ATTEMPTS_PREFIX + email);
        return code;
    }

    public boolean verify(String email, String code) {
        String stored = redisTemplate.opsForValue().get(CODE_PREFIX + email);
        if (stored == null || code == null) {
            return false;
        }

        boolean matches = MessageDigest.isEqual(
                stored.getBytes(StandardCharsets.UTF_8),
                code.getBytes(StandardCharsets.UTF_8));

        if (matches) {
            redisTemplate.delete(CODE_PREFIX + email);
            redisTemplate.delete(ATTEMPTS_PREFIX + email);
            return true;
        }

        Long attempts = redisTemplate.opsForValue().increment(ATTEMPTS_PREFIX + email);
        if (attempts != null && attempts == 1L) {
            redisTemplate.expire(ATTEMPTS_PREFIX + email, CODE_TTL);
        }
        if (attempts != null && attempts >= MAX_ATTEMPTS) {
            redisTemplate.delete(CODE_PREFIX + email);
            redisTemplate.delete(ATTEMPTS_PREFIX + email);
        }
        return false;
    }
}
