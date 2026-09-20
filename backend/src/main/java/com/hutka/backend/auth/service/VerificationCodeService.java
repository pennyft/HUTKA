package com.hutka.backend.auth.service;


import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class VerificationCodeService {

    private static final Duration  CODE_TTL = Duration.ofMinutes(15);
    private static final String KEY_PREFIX = "email-verify:";
    private final StringRedisTemplate redisTemplate;

    public String generateAndStore(String email) {
        String code = String.format("%06d", ThreadLocalRandom.current().nextInt(0, 1_000_000));
        redisTemplate.opsForValue().set(KEY_PREFIX+email,code,CODE_TTL);
        return code;
    }

    public boolean verify(String email, String code) {
        String introduced = redisTemplate.opsForValue().get(KEY_PREFIX+email);
        if (introduced == null)
            return false;
        boolean result = introduced.equals(code);
        if (result)  {
            redisTemplate.delete(KEY_PREFIX+email);}
        return result;    }



}
