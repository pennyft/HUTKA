package com.hutka.backend.uploads;

import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Выдача подписанных ссылок для прямой загрузки фото из браузера в Cloudflare R2. Сам файл через бэк не идёт.
 * Ключи доступа к R2 живут только здесь (переменные окружения), во фронт они не попадают.
 * Ограничение: тип (image/jpeg) входит в подпись и принудительно соблюдается, а размер подпись не фиксирует: его проверяем при выдаче
 * ссылки по заявленному size, но технически за 5 минут действия ссылки можно загрузить и больший файл. Для учебного проекта это принято,
 * для продакшена добавьте лимит размера в самом хранилище или проверку после загрузки.
 */
@Service
public class UploadService {
    static final String CONTENT_TYPE = "image/jpeg";

    private final String endpoint;
    private final String bucket;
    private final String accessKeyId;
    private final String secretAccessKey;
    private final String publicBaseUrl;
    private final String region;
    private final long maxBytes;
    private final int ttlSeconds;
    private final boolean local;
    private final LocalUploadStore localStore;

    public UploadService(@Value("${app.uploads.r2.endpoint:}") String endpoint,
                         @Value("${app.uploads.r2.bucket:}") String bucket,
                         @Value("${app.uploads.r2.access-key-id:}") String accessKeyId,
                         @Value("${app.uploads.r2.secret-access-key:}") String secretAccessKey,
                         @Value("${app.uploads.public-base-url:}") String publicBaseUrl,
                         @Value("${app.uploads.max-bytes:3145728}") long maxBytes,
                         @Value("${app.uploads.ttl-seconds:300}") int ttlSeconds,
                         @Value("${app.uploads.r2.region:auto}") String region,
                         @Value("${app.uploads.mode:r2}") String mode,
                         LocalUploadStore localStore) {
        this.endpoint = endpoint.trim();
        this.bucket = bucket.trim();
        this.accessKeyId = accessKeyId.trim();
        this.secretAccessKey = secretAccessKey.trim();
        this.publicBaseUrl = publicBaseUrl.trim().replaceAll("/+$", "");
        this.maxBytes = maxBytes;
        this.ttlSeconds = ttlSeconds;
        this.region = region.trim().isEmpty() ? "auto" : region.trim();
        this.local = "local".equalsIgnoreCase(mode.trim());
        this.localStore = localStore;
    }

    public PresignResponse presign(PresignRequest request) {
        if (local) {
            // app.uploads.mode=local: файл принимает сам бэкенд (LocalUploadController), сжимает и кладёт в папку на диске
            if (request.size() > maxBytes) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Фото больше " + Math.max(1, maxBytes / 1024 / 1024) + " МБ");
            }
            Instant now = Instant.now();
            return localStore.presign(UploadKeys.objectKey(request.folder(), now, UUID.randomUUID()), ttlSeconds, now);
        }
        if (endpoint.isEmpty() || bucket.isEmpty() || accessKeyId.isEmpty() || secretAccessKey.isEmpty() || publicBaseUrl.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Загрузка фото не настроена на сервере");
        }
        if (request.size() > maxBytes) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Фото больше " + Math.max(1, maxBytes / 1024 / 1024) + " МБ");
        }
        Instant now = Instant.now();
        String key = UploadKeys.objectKey(request.folder(), now, UUID.randomUUID());
        String uploadUrl = R2Presigner.presignPut(endpoint, bucket, key, CONTENT_TYPE, accessKeyId, secretAccessKey, region, ttlSeconds, now);
        return new PresignResponse(uploadUrl, publicBaseUrl + "/" + key, CONTENT_TYPE, ttlSeconds);
    }
}