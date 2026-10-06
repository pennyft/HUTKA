package com.hutka.backend.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

/**
 * Простой счётчик попыток в Redis (фиксированное окно): INCR + EXPIRE.
 * Если Redis недоступен, исключение уходит наверх — запрос завершится ошибкой, а не пройдёт без лимита.
 */
@Service
@RequiredArgsConstructor
public class RateLimitService {

    private static final String KEY_PREFIX = "rate-limit:";

    private final StringRedisTemplate redisTemplate;

    /** Засчитывает попытку; при превышении maxAttempts за окно бросает 429. */
    public void check(String key, int maxAttempts, Duration window) {
        String redisKey = KEY_PREFIX + key;
        Long count = redisTemplate.opsForValue().increment(redisKey);
        if (count == null) {
            return;
        }
        // TTL выставляем на первой попытке; если ключ вдруг остался без TTL — чиним
        Long ttl = redisTemplate.getExpire(redisKey);
        if (count == 1L || ttl == null || ttl < 0) {
            redisTemplate.expire(redisKey, window);
        }
        if (count > maxAttempts) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Слишком много попыток. Попробуйте позже");
        }
    }

    public void reset(String key) {
        redisTemplate.delete(KEY_PREFIX + key);
    }
}
