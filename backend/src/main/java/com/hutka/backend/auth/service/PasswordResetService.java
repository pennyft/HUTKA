package com.hutka.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final Duration TOKEN_TTL = Duration.ofHours(1);
    private static final String KEY_PREFIX = "password-reset:";

    private final StringRedisTemplate redisTemplate;

    public String generateToken(String email) {
        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set(KEY_PREFIX + token, email, TOKEN_TTL);
        return token;
    }

    public String consumeToken(String token) {
        String key = KEY_PREFIX + token;
        String email = redisTemplate.opsForValue().get(key);
        if (email != null) {
            redisTemplate.delete(key);
        }
        return email;
    }
}