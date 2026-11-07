package com.hutka.backend.uploads;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.regex.Pattern;

/**
 * Локальная замена Cloudflare R2 для разработки (app.uploads.mode=local). Сохраняет контракт /uploads/presign:
 * фронт по-прежнему получает uploadUrl и делает на него PUT, но uploadUrl теперь ведёт на этот же бэкенд
 * (PUT /uploads/local), а файл после проверки подписи сжимается и кладётся в папку app.uploads.local.dir.
 * Подпись (HMAC-SHA256 от «ключ|срок») заменяет JWT: браузер шлёт PUT без Authorization, как и в случае с R2.
 */
@Component
public class LocalUploadStore {

    /** Ключ строго такого вида (см. UploadKeys): защита от выхода из папки через «../». */
    private static final Pattern KEY = Pattern.compile("^(cars|bookings)/\\d{4}-\\d{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.jpg$");

    private final Path baseDir;
    private final String backendBaseUrl;
    private final byte[] secret;
    private final int maxSide;
    private final float quality;
    private final long maxPixels;

    public LocalUploadStore(@Value("${app.uploads.local.dir:./data/uploads}") String dir,
                            @Value("${app.uploads.local.backend-base-url:http://localhost:8080}") String backendBaseUrl,
                            @Value("${app.uploads.local.signing-secret:${app.jwt.secret}}") String secret,
                            @Value("${app.uploads.local.max-side:1600}") int maxSide,
                            @Value("${app.uploads.local.jpeg-quality:0.8}") float quality,
                            @Value("${app.uploads.local.max-pixels:40000000}") long maxPixels) {
        this.baseDir = Path.of(dir).toAbsolutePath().normalize();
        this.backendBaseUrl = backendBaseUrl.trim().replaceAll("/+$", "");
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.maxSide = maxSide;
        this.quality = quality;
        this.maxPixels = maxPixels;
    }

    @PostConstruct
    void init() throws IOException {
        Files.createDirectories(baseDir);
    }

    public Path baseDir() {
        return baseDir;
    }

    /** Ответ для /uploads/presign в режиме local. */
    PresignResponse presign(String key, int ttlSeconds, Instant now) {
        long exp = now.plusSeconds(ttlSeconds).getEpochSecond();
        String uploadUrl = backendBaseUrl + "/uploads/local?key=" + R2Presigner.encode(key) + "&exp=" + exp + "&sig=" + sign(key, exp);
        return new PresignResponse(uploadUrl, backendBaseUrl + "/files/" + key, UploadService.CONTENT_TYPE, ttlSeconds);
    }

    /** Проверка подписи и срока; иначе 403. */
    void verify(String key, long exp, String sig) {
        boolean ok = KEY.matcher(key).matches()
                && Instant.now().getEpochSecond() <= exp
                && MessageDigest.isEqual(sign(key, exp).getBytes(StandardCharsets.UTF_8), sig.getBytes(StandardCharsets.UTF_8));
        if (!ok) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ссылка на загрузку недействительна или устарела");
        }
    }

    /** Сжимает и сохраняет. Повторная загрузка по той же ссылке даёт 409: ссылка одноразовая. */
    void saveCompressed(String key, byte[] raw) {
        byte[] jpeg;
        try {
            jpeg = ImageCompressor.toJpeg(raw, maxSide, quality, maxPixels);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось сжать фото " + key, e);
        }
        Path target = baseDir.resolve(key).normalize();
        if (!target.startsWith(baseDir)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Недопустимый ключ");
        }
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, jpeg, StandardOpenOption.CREATE_NEW);
        } catch (FileAlreadyExistsException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Файл по этой ссылке уже загружен");
        } catch (IOException e) {
            throw new UncheckedIOException("Не удалось сохранить фото " + key, e);
        }
    }

    private String sign(String key, long exp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            byte[] raw = mac.doFinal((key + "|" + exp).getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(raw.length * 2);
            for (byte b : raw) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(e);
        }
    }
}
