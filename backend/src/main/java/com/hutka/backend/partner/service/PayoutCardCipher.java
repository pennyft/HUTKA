package com.hutka.backend.partner.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;

/**
 * Шифрование номера карты партнёра (раздел 10.6, 15) на уровне приложения: AES-256-GCM.
 * Ключ — свойство {@code app.payout.encryption-key}: base64 от 32 случайных байт
 * (например, {@code openssl rand -base64 32}). Без ключа приложение не стартует (как и без app.jwt.secret).
 * Формат значения: {@code v1:<base64(iv || шифртекст+тег)>}.
 * В AAD пишется id пользователя, поэтому значение нельзя «перенести» в запись другого пользователя.
 * Ключ нужно хранить вне БД: иначе шифрование ничего не даёт.
 */
@Component
public class PayoutCardCipher {

    private static final String PREFIX = "v1:";
    private static final int IV_BYTES = 12;
    private static final int TAG_BITS = 128;
    private static final int KEY_BYTES = 32;

    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public PayoutCardCipher(@Value("${app.payout.encryption-key}") String base64Key) {
        byte[] raw;
        try {
            raw = Base64.getDecoder().decode(base64Key.trim());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("app.payout.encryption-key должен быть в формате base64", e);
        }
        if (raw.length != KEY_BYTES) {
            throw new IllegalStateException("app.payout.encryption-key должен содержать ровно " + KEY_BYTES
                    + " байт (после base64-декодирования), сейчас: " + raw.length);
        }
        this.key = new SecretKeySpec(raw, "AES");
    }

    public String encrypt(String plain, UUID userId) {
        try {
            byte[] iv = new byte[IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            cipher.updateAAD(aad(userId));
            byte[] encrypted = cipher.doFinal(plain.getBytes(StandardCharsets.UTF_8));
            ByteBuffer out = ByteBuffer.allocate(iv.length + encrypted.length);
            out.put(iv).put(encrypted);
            return PREFIX + Base64.getEncoder().encodeToString(out.array());
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Не удалось зашифровать номер карты", e);
        }
    }

    public String decrypt(String stored, UUID userId) {
        if (stored == null || !stored.startsWith(PREFIX)) {
            throw new IllegalStateException("Неизвестный формат зашифрованного номера карты");
        }
        try {
            byte[] all = Base64.getDecoder().decode(stored.substring(PREFIX.length()));
            if (all.length <= IV_BYTES) {
                throw new IllegalStateException("Зашифрованный номер карты повреждён");
            }
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, all, 0, IV_BYTES));
            cipher.updateAAD(aad(userId));
            byte[] plain = cipher.doFinal(all, IV_BYTES, all.length - IV_BYTES);
            return new String(plain, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            // не расшифровывается: неверный ключ, изменённые данные или чужая запись
            throw new IllegalStateException("Не удалось расшифровать номер карты", e);
        }
    }

    private static byte[] aad(UUID userId) {
        return userId.toString().getBytes(StandardCharsets.UTF_8);
    }
}
